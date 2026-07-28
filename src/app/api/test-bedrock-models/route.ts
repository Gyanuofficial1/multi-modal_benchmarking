import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

async function testModel(modelId: string, region: string) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  try {
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    const payload = {
      messages: [
        {
          role: 'user',
          content: 'Hello, reply with "OK".'
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    };

    await client.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      })
    );

    return { modelId, region, status: 'SUCCESS' };
  } catch (err: any) {
    return { modelId, region, status: 'FAILED', error: err.message };
  }
}

export async function GET() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return NextResponse.json({ success: false, error: 'Credentials not configured' });
  }

  const tests = [
    { modelId: 'google.gemma-3-12b-it', region: 'ap-south-1' },
    { modelId: 'google.gemma-3-12b-it', region: 'us-east-1' },
    { modelId: 'deepseek.v3.2', region: 'us-east-1' },
    { modelId: 'amazon.titan-text-express-v1', region: 'us-east-1' }
  ];

  const results = [];
  for (const t of tests) {
    const res = await testModel(t.modelId, t.region);
    results.push(res);
  }

  return NextResponse.json({ success: true, results });
}
