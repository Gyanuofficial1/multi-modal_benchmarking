import { NextRequest, NextResponse } from 'next/server';
import { AIModel, ModelBenchmarkResult, ResumeFileItem } from '../../../types/benchmark';
import { evaluateJsonAccuracy } from '../../../services/jsonEvaluator';
import { calculateEstimatedCost } from '../../../services/pricingMatrix';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

function getVertexLocationForModel(modelId: string): string {
  const envMap: Record<string, string | undefined> = {
    'vertex-gemini-2.5-flash': process.env.VERTEX_LOCATION_GEMINI_2_5_FLASH,
    'vertex-gemini-2.5-flash-lite': process.env.VERTEX_LOCATION_GEMINI_2_5_FLASH_LITE,
    'vertex-gemini-3.1-flash-lite': process.env.VERTEX_LOCATION_GEMINI_3_1_FLASH_LITE,
    'vertex-gemini-3.5-flash-lite': process.env.VERTEX_LOCATION_GEMINI_3_5_FLASH_LITE,
  };

  return envMap[modelId] || process.env.VERTEX_LOCATION || 'us-central1';
}

function shouldUseRawFile(
  envVal: string | undefined,
  extractionMode: string,
  extractedText: string
): boolean {
  const conf = (envVal || 'auto').toLowerCase().trim();
  if (conf === 'off' || conf === 'false') {
    return true;
  }
  if (conf === 'on' || conf === 'true') {
    return false;
  }
  const textLen = (extractedText || '').trim().length;
  return extractionMode === 'DIRECT_FILE_MULTIMODAL' || textLen < 100;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      model,
      resumeItem,
      expectedJson,
      systemPrompt,
    }: {
      model: AIModel;
      resumeItem: ResumeFileItem;
      expectedJson: Record<string, any>;
      systemPrompt?: string;
    } = body;

    const sysPrompt = (systemPrompt || '').trim();
    const startTime = performance.now();

    let rawText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let actualExtractionMode = resumeItem.extractionMode;

    // Helper to format text prompt with system instructions
    const buildUserText = (resumeText: string) => {
      if (sysPrompt) {
        return `${sysPrompt}\n\nResume Input Text:\n${resumeText}`;
      }
      return resumeText;
    };

    // ------------------------------------------------------------------------
    // 1. Google Direct AI Provider (Uses GOOGLE_API_KEY ONLY)
    // ------------------------------------------------------------------------
    if (model.provider === 'google') {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: `GOOGLE_API_KEY is missing in .env.local file.` },
          { status: 400 }
        );
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`;

      const envVal = process.env.GEMINI_TEXT_EXTRACTION || process.env.GOOGLE_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);

      let parts: any[] = [];
      if (useRawFile && resumeItem.base64Data) {
        actualExtractionMode = 'DIRECT_FILE_MULTIMODAL';
        parts = [
          { text: sysPrompt ? `${sysPrompt}\n\nParse the attached PDF resume document into JSON:` : 'Parse the attached PDF resume document into JSON:' },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: resumeItem.base64Data,
            },
          },
        ];
      } else {
        actualExtractionMode = 'TEXT_PROMPT';
        parts = [{ text: buildUserText(resumeItem.extractedText) }];
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Google Direct API error (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      inputTokens = data?.usageMetadata?.promptTokenCount || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
      outputTokens = data?.usageMetadata?.candidatesTokenCount || Math.round(rawText.length / 4);
    }
    // ------------------------------------------------------------------------
    // 2. Google Vertex AI Provider (Production GCP Specification)
    // ------------------------------------------------------------------------
    else if (model.provider === 'vertex') {
      const apiKey = process.env.VERTEX_API_KEY;
      const projectId = process.env.VERTEX_PROJECT_ID;
      const location = getVertexLocationForModel(model.id).toLowerCase().trim();

      if (!apiKey) {
        return NextResponse.json(
          { error: `VERTEX_API_KEY is missing in .env.local file.` },
          { status: 400 }
        );
      }

      const vertexModelId = model.id.replace(/^vertex-/, '');

      const envVal = process.env.VERTEX_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);

      let parts: any[] = [];
      if (useRawFile && resumeItem.base64Data) {
        actualExtractionMode = 'DIRECT_FILE_MULTIMODAL';
        parts = [
          { text: sysPrompt ? `${sysPrompt}\n\nParse the attached PDF resume document into JSON:` : 'Parse the attached PDF resume document into JSON:' },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: resumeItem.base64Data,
            },
          },
        ];
      } else {
        actualExtractionMode = 'TEXT_PROMPT';
        parts = [{ text: buildUserText(resumeItem.extractedText) }];
      }

      // Check credential type: OAuth2 Token (ya29...) vs API Key (AIza...)
      const isOauthToken = apiKey.startsWith('ya29.');

      let url = '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let host = '';
      if (location === 'global') {
        host = 'aiplatform.googleapis.com';
      } else if (location.startsWith('us')) {
        host = 'aiplatform.us.rep.googleapis.com';
      } else if (location.startsWith('eu') || location.startsWith('europe')) {
        host = 'aiplatform.eu.rep.googleapis.com';
      } else {
        host = `${location}-aiplatform.googleapis.com`;
      }
      const projPath = projectId ? `/projects/${projectId}` : '';

      if (isOauthToken) {
        // Official GCP Regional Endpoint with OAuth 2.0 Bearer Token (e.g. gcloud auth access token)
        url = `https://${host}/v1${projPath}/locations/${location}/publishers/google/models/${vertexModelId}:generateContent`;
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        // Official GCP Vertex AI Endpoint using API key (e.g., keys starting with AQ. or AIza...)
        if (!projectId) {
          return NextResponse.json(
            { error: `VERTEX_PROJECT_ID is missing in .env.local file. Project ID is required for Vertex AI with API Keys.` },
            { status: 400 }
          );
        }
        url = `https://${host}/v1${projPath}/locations/${location}/publishers/google/models/${vertexModelId}:generateContent?key=${apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Vertex AI (${location}) error (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      inputTokens = data?.usageMetadata?.promptTokenCount || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
      outputTokens = data?.usageMetadata?.candidatesTokenCount || Math.round(rawText.length / 4);
    }
    // ------------------------------------------------------------------------
    // 3. OpenAI Direct Provider
    // ------------------------------------------------------------------------
    else if (model.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: `OPENAI_API_KEY is missing in .env.local file.` },
          { status: 400 }
        );
      }

      const envVal = process.env.OPENAI_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);
      actualExtractionMode = 'TEXT_PROMPT';

      const messages: any[] = [];
      if (sysPrompt) {
        messages.push({ role: 'system', content: sysPrompt });
      }
      messages.push({ role: 'user', content: resumeItem.extractedText });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          response_format: { type: 'json_object' },
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `OpenAI API error (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      rawText = data?.choices?.[0]?.message?.content || '';
      inputTokens = data?.usage?.prompt_tokens || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
      outputTokens = data?.usage?.completion_tokens || Math.round(rawText.length / 4);
    }
    // ------------------------------------------------------------------------
    // 4. Anthropic Direct Provider
    // ------------------------------------------------------------------------
    else if (model.provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: `ANTHROPIC_API_KEY is missing in .env.local file.` },
          { status: 400 }
        );
      }

      const envVal = process.env.ANTHROPIC_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);

      const reqBody: any = {
        model: model.id,
        max_tokens: 4096,
      };
      if (sysPrompt) {
        reqBody.system = sysPrompt;
      }

      if (useRawFile && resumeItem.base64Data) {
        actualExtractionMode = 'DIRECT_FILE_MULTIMODAL';
        reqBody.messages = [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: resumeItem.base64Data,
                },
              },
              {
                type: 'text',
                text: 'Analyze the attached resume document.',
              },
            ],
          },
        ];
      } else {
        actualExtractionMode = 'TEXT_PROMPT';
        reqBody.messages = [{ role: 'user', content: resumeItem.extractedText }];
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Anthropic API error (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      rawText = (data?.content || [])
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
      inputTokens = data?.usage?.input_tokens || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
      outputTokens = data?.usage?.output_tokens || Math.round(rawText.length / 4);
    }
    // ------------------------------------------------------------------------
    // 5. Microsoft Azure AI Foundry Provider
    // ------------------------------------------------------------------------
    else if (model.provider === 'azure') {
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
      let deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
      let apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

      // Dynamically resolve environment variables based on the model ID
      const formattedModelKey = model.id.replace(/^azure-/, '').replace(/[\.-]/g, '_').toUpperCase();
      const customDeploymentEnv = process.env[`AZURE_OPENAI_DEPLOYMENT_${formattedModelKey}`];
      const customApiVersionEnv = process.env[`AZURE_OPENAI_API_VERSION_${formattedModelKey}`];

      if (customDeploymentEnv) {
        deployment = customDeploymentEnv;
      } else {
        // Fallbacks for known models
        if (model.id === 'azure-gpt-5.4-nano') deployment = 'gpt-5.4-nano';
        else if (model.id === 'azure-gpt-5.4-mini') deployment = 'gpt-5.4-mini';
        else if (model.id === 'azure-gpt-5-mini') deployment = 'gpt-5-mini';
        else if (model.id === 'azure-gpt-4.1-mini') deployment = 'gpt-4.1-mini';
        else if (model.id === 'azure-gpt-4o-min') deployment = 'gpt-4o-min';
        else if (model.id === 'azure-gpt-4o-mini') deployment = 'gpt-4o-mini';
        else if (model.id === 'azure-gpt-4o') deployment = 'gpt-4o';
        else if (model.id === 'azure-deepseek-v4-flash') deployment = 'DeepSeek-V4-Flash';
        else if (model.id === 'azure-grok-4-1-fast-non-reasoning') deployment = 'Grok-4-1-fast-non-reasoning';
      }

      if (customApiVersionEnv) {
        apiVersion = customApiVersionEnv;
      } else {
        // Fallbacks for known models
        if (model.id === 'azure-deepseek-v4-flash') apiVersion = '2024-05-01-preview';
      }


      if (!apiKey || !endpoint) {
        return NextResponse.json(
          { error: `AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT is missing in .env.local file.` },
          { status: 400 }
        );
      }

      const envVal = process.env.AZURE_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);
      actualExtractionMode = 'TEXT_PROMPT';

      const messages: any[] = [];
      if (sysPrompt) {
        messages.push({ role: 'system', content: sysPrompt });
      }
      messages.push({ role: 'user', content: resumeItem.extractedText });

      let url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      };

      const bodyPayload: any = {
        response_format: { type: 'json_object' },
        messages,
      };

      const customUseV1Env = process.env[`AZURE_OPENAI_USE_V1_PATH_${formattedModelKey}`];
      let useV1Path = model.id !== 'azure-gpt-4o' && model.id !== 'azure-gpt-4o-mini';

      if (customUseV1Env === 'true') {
        useV1Path = true;
      } else if (customUseV1Env === 'false') {
        useV1Path = false;
      }

      if (useV1Path) {
        url = `${endpoint}/openai/v1/chat/completions`;
        bodyPayload.model = deployment;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Azure AI error (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      rawText = data?.choices?.[0]?.message?.content || '';
      inputTokens = data?.usage?.prompt_tokens || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
      outputTokens = data?.usage?.completion_tokens || Math.round(rawText.length / 4);
    }
    // ------------------------------------------------------------------------
    // 6. AWS Bedrock Provider
    // ------------------------------------------------------------------------
    else if (model.provider === 'bedrock') {
      const bearerTokenEnv = process.env.AWS_BEARER_TOKEN_BEDROCK;
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      let region = process.env.AWS_REGION || 'us-east-1';
      if (model.id === 'bedrock-gemma-3-12b-it' && process.env.BEDROCK_REGION_GEMMA_3_12B_IT) {
        region = process.env.BEDROCK_REGION_GEMMA_3_12B_IT;
      } else if (model.id === 'bedrock-deepseek-v3-1' && process.env.BEDROCK_REGION_DEEPSEEK_V3_1) {
        region = process.env.BEDROCK_REGION_DEEPSEEK_V3_1;
      }

      const activeToken = bearerTokenEnv || accessKeyId;

      if (!activeToken) {
        return NextResponse.json(
          { error: `AWS Bedrock credentials (AWS_BEARER_TOKEN_BEDROCK or AWS_ACCESS_KEY_ID) are missing in .env.local file.` },
          { status: 400 }
        );
      }

      const isBearerToken = !!bearerTokenEnv || 
                            activeToken.startsWith('ABSK') || 
                            activeToken.startsWith('bedrock-api-key-');

      let cleanedToken = activeToken;
      if (isBearerToken && cleanedToken.includes('%')) {
        cleanedToken = decodeURIComponent(cleanedToken);
      }

      const envVal = process.env.BEDROCK_TEXT_EXTRACTION;
      const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);

      // Map model.id to AWS Bedrock model IDs
      const bedrockModelIds: Record<string, string> = {
        'bedrock-deepseek-v3-1': 'deepseek.v3.2',
        'bedrock-gemma-3-12b-it': 'google.gemma-3-12b-it',
      };
      const targetModelId = bedrockModelIds[model.id] || model.id;

      let payload: any = {};
      if (targetModelId.includes('deepseek') || targetModelId.includes('gemma')) {
        actualExtractionMode = 'TEXT_PROMPT';
        const userContent = sysPrompt 
          ? `${sysPrompt}\n\nUser Content:\n${resumeItem.extractedText}`
          : resumeItem.extractedText;
        payload = {
          messages: [
            {
              role: 'user',
              content: userContent
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      } else if (targetModelId.includes('anthropic.claude')) {
        payload = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
        };
        if (sysPrompt) {
          payload.system = sysPrompt;
        }

        if (useRawFile && resumeItem.base64Data) {
          actualExtractionMode = 'DIRECT_FILE_MULTIMODAL';
          payload.messages = [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: resumeItem.base64Data,
                  },
                },
                {
                  type: 'text',
                  text: 'Analyze the attached resume document.',
                },
              ],
            },
          ];
        } else {
          actualExtractionMode = 'TEXT_PROMPT';
          payload.messages = [{ role: 'user', content: resumeItem.extractedText }];
        }
      } else if (targetModelId.includes('meta.llama')) {
        actualExtractionMode = 'TEXT_PROMPT';
        payload = {
          prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${sysPrompt || 'You are a resume parser.'}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${resumeItem.extractedText}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
          max_gen_len: 2048,
          temperature: 0.1,
        };
      } else if (targetModelId.includes('amazon.titan')) {
        actualExtractionMode = 'TEXT_PROMPT';
        payload = {
          inputText: `${sysPrompt || 'You are a resume parser.'}\n\nUser: ${resumeItem.extractedText}\n\nBot:`,
          textGenerationConfig: {
            maxTokenCount: 2048,
            temperature: 0.1,
          },
        };
      } else {
        actualExtractionMode = 'TEXT_PROMPT';
        payload = {
          inputText: resumeItem.extractedText,
        };
      }

      try {
        let resBody: any = null;

        if (isBearerToken) {
          // 1. Bearer Token Flow (Direct HTTPS request, bypassing SDK SigV4 signing)
          const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${targetModelId}/invoke`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanedToken}`
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json(
              { error: `AWS Bedrock Bearer Token API error (${response.status}): ${errText}` },
              { status: response.status }
            );
          }

          resBody = await response.json();
        } else {
          // 2. Standard AWS IAM Credentials Flow (SDK SigV4 signing)
          if (!secretAccessKey) {
            return NextResponse.json(
              { error: `AWS_SECRET_ACCESS_KEY is missing in .env.local file. Standard AWS credentials require secret access key.` },
              { status: 400 }
            );
          }

          const client = new BedrockRuntimeClient({
            region,
            credentials: {
              accessKeyId: activeToken,
              secretAccessKey,
            },
          });

          const response = await client.send(
            new InvokeModelCommand({
              modelId: targetModelId,
              contentType: 'application/json',
              accept: 'application/json',
              body: JSON.stringify(payload),
            })
          );

          resBody = JSON.parse(new TextDecoder().decode(response.body));
        }

        // Parse Response Body
        if (targetModelId.includes('deepseek') || targetModelId.includes('gemma')) {
          rawText = resBody?.choices?.[0]?.message?.content || '';
          inputTokens = resBody?.usage?.prompt_tokens || Math.round((resumeItem.extractedText.length + (sysPrompt || '').length) / 4);
          outputTokens = resBody?.usage?.completion_tokens || Math.round(rawText.length / 4);
        } else if (targetModelId.includes('anthropic.claude')) {
          rawText = (resBody?.content || [])
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('');
          inputTokens = resBody?.usage?.input_tokens || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
          outputTokens = resBody?.usage?.output_tokens || Math.round(rawText.length / 4);
        } else if (targetModelId.includes('meta.llama')) {
          rawText = resBody?.generation || '';
          inputTokens = Math.round((resumeItem.extractedText.length + (sysPrompt || '').length) / 4);
          outputTokens = Math.round(rawText.length / 4);
        } else if (targetModelId.includes('amazon.titan')) {
          rawText = resBody?.results?.[0]?.outputText || '';
          inputTokens = resBody?.inputTextTokenCount || Math.round((resumeItem.extractedText.length + (sysPrompt || '').length) / 4);
          outputTokens = Math.round(rawText.length / 4);
        } else {
          rawText = resBody?.outputText || JSON.stringify(resBody);
          inputTokens = Math.round(resumeItem.extractedText.length / 4);
          outputTokens = Math.round(rawText.length / 4);
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `AWS Bedrock invocation error: ${err?.message || err}` },
          { status: 500 }
        );
      }
    }
    // ------------------------------------------------------------------------
    // 7. Mistral Direct Provider
    // ------------------------------------------------------------------------
    else if (model.provider === 'mistral') {
      const apiKey = process.env.MISTRAL_API_KEY || process.env['mistral api key'] || process.env['MISTRAL_API_KEY'];
      if (!apiKey) {
        return NextResponse.json(
          { error: `MISTRAL_API_KEY is missing in .env.local file.` },
          { status: 400 }
        );
      }

      if (model.id === 'mistral-ocr-latest') {
        if (!resumeItem.base64Data) {
          return NextResponse.json(
            { error: `Mistral OCR requires a raw PDF file. Please upload a PDF resume document.` },
            { status: 400 }
          );
        }

        actualExtractionMode = 'DIRECT_FILE_MULTIMODAL';

        // 1. Upload file to Mistral Files API
        const buffer = Buffer.from(resumeItem.base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('purpose', 'ocr');
        formData.append('file', blob, resumeItem.fileName || 'resume.pdf');

        const uploadRes = await fetch('https://api.mistral.ai/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          return NextResponse.json(
            { error: `Mistral Upload API error (${uploadRes.status}): ${errText}` },
            { status: uploadRes.status }
          );
        }

        const uploadData = await uploadRes.json();
        const fileId = uploadData.id;

        // 2. Call Mistral OCR API
        const ocrRes = await fetch('https://api.mistral.ai/v1/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: {
              type: 'file_id',
              file_id: fileId,
            },
            document_annotation_format: {
              type: 'json_object',
            },
            document_annotation_prompt: sysPrompt || 'Parse the resume document into JSON matching the expected keys.',
          }),
        });

        if (!ocrRes.ok) {
          const errText = await ocrRes.text();
          return NextResponse.json(
            { error: `Mistral OCR API error (${ocrRes.status}): ${errText}` },
            { status: ocrRes.status }
          );
        }

        const ocrData = await ocrRes.json();

        // 3. Extract output
        rawText = typeof ocrData.document_annotation === 'object'
          ? JSON.stringify(ocrData.document_annotation)
          : (ocrData.document_annotation || '');

        if (!rawText && ocrData.pages) {
          // Fallback to combined markdown text from all pages
          rawText = ocrData.pages.map((p: any) => p.markdown || '').join('\n\n');
        }

        inputTokens = Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
        outputTokens = Math.round(rawText.length / 4);
      } else {
        const envVal = process.env.MISTRAL_TEXT_EXTRACTION;
        const useRawFile = shouldUseRawFile(envVal, resumeItem.extractionMode, resumeItem.extractedText);
        actualExtractionMode = 'TEXT_PROMPT';

        const messages: any[] = [];
        if (sysPrompt) {
          messages.push({ role: 'system', content: sysPrompt });
        }
        messages.push({ role: 'user', content: resumeItem.extractedText });

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            response_format: { type: 'json_object' },
            messages,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return NextResponse.json(
            { error: `Mistral API error (${response.status}): ${errText}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        rawText = data?.choices?.[0]?.message?.content || '';
        inputTokens = data?.usage?.prompt_tokens || Math.round((resumeItem.extractedText.length + sysPrompt.length) / 4);
        outputTokens = data?.usage?.completion_tokens || Math.round(rawText.length / 4);
      }
    } else {
      return NextResponse.json({ error: `Unsupported provider ${model.provider}` }, { status: 400 });
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const costCalc = calculateEstimatedCost(model, inputTokens, outputTokens);
    const accuracy = evaluateJsonAccuracy(expectedJson, rawText);

    const result: ModelBenchmarkResult = {
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      providerName: model.providerName,
      resumeFileName: resumeItem.fileName,
      extractionMode: actualExtractionMode,
      rawResponseText: rawText,
      parsedJson: accuracy.rawParsedJson,
      latencyMs: durationMs,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: costCalc.costUsd,
      estimatedCostInr: costCalc.costInr,
      accuracy,
      status: 'SUCCESS',
      timestamp: new Date().toLocaleTimeString(),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server API execution error' },
      { status: 500 }
    );
  }
}
