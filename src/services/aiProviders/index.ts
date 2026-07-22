import { AIModel, ModelBenchmarkResult, ProviderApiConfig, ResumeFileItem } from '../../types/benchmark';
import { evaluateJsonAccuracy } from '../jsonEvaluator';

// Benchmark single model by posting to secure Server API Endpoint /api/benchmark
export async function benchmarkSingleModel(
  model: AIModel,
  resumeItem: ResumeFileItem,
  expectedJson: Record<string, any>,
  config: ProviderApiConfig,
  systemPrompt?: string
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
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || `API benchmark error (${res.status}): ${res.statusText}`);
    }

    const result: ModelBenchmarkResult = await res.json();
    return result;
  } catch (error: any) {
    console.error(`Error benchmarking model ${model.name}:`, error);
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
      errorMessage: error?.message || 'Server API execution failed',
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}
