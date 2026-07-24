import { AIModel, ModelBenchmarkResult, ProviderApiConfig, ResumeFileItem } from '../../types/benchmark';
import { evaluateJsonAccuracy } from '../jsonEvaluator';

// Benchmark single model by posting to secure Server API Endpoint /api/benchmark
export async function benchmarkSingleModel(
  model: AIModel,
  resumeItem: ResumeFileItem,
  expectedJson: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  config: ProviderApiConfig,
  systemPrompt?: string,
  globalExtractionMode?: 'TEXT_ONLY' | 'AUTO' | 'FILE_ONLY'
): Promise<ModelBenchmarkResult> {
  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        resumeItem,
        expectedJson,
        systemPrompt,
        globalExtractionMode,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || `API benchmark error (${res.status}): ${res.statusText}`);
    }

    const result: ModelBenchmarkResult = await res.json();
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Error benchmarking model ${model.name}:`, err);
    return {
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      providerName: model.providerName,
      resumeFileName: resumeItem.fileName,
      extractionMode: resumeItem.extractionMode,
      rawResponseText: '',
      parsedJson: null,
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      estimatedCostInr: 0,
      accuracy: evaluateJsonAccuracy(expectedJson, ''),
      status: 'ERROR',
      errorMessage: err.message || 'Server API execution failed',
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}
