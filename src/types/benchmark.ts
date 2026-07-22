export type ProviderId = 
  | 'google'
  | 'vertex'
  | 'openai'
  | 'azure'
  | 'anthropic'
  | 'bedrock'
  | 'mistral';

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  providerName: string;
  badgeColor: string;
  inputCostPer1M: number; // USD per 1M tokens
  outputCostPer1M: number; // USD per 1M tokens
  contextWindow: number;
  description: string;
  defaultSimulatedLatencyMs: number;
  accuracyMultiplier: number;
}

export interface ProviderApiConfig {
  googleApiKey?: string;
  vertexProjectId?: string;
  vertexLocation?: string;
  vertexApiKey?: string;
  openaiApiKey?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentId?: string;
  anthropicApiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  mistralApiKey?: string;
}

export interface JsonDiffDetail {
  keyPath: string;
  expectedValue: any;
  actualValue: any;
  status: 'MATCH' | 'MISMATCH' | 'MISSING' | 'EXTRA';
  similarityScore: number; // 0 - 100%
  reason?: string;
}

export interface JsonAccuracyReport {
  overallAccuracy: number; // 0 - 100%
  keyMatchPercentage: number; // 0 - 100%
  valueMatchPercentage: number; // 0 - 100%
  schemaValidationScore: number; // 0 or 100%
  totalExpectedKeys: number;
  matchedKeysCount: number;
  missingKeysCount: number;
  mismatchedKeysCount: number;
  diffDetails: JsonDiffDetail[];
  rawParsedJson?: any;
  parseError?: string;
}

export interface ModelBenchmarkResult {
  modelId: string;
  modelName: string;
  provider: ProviderId;
  providerName: string;
  resumeFileName?: string;
  extractionMode?: 'TEXT_PROMPT' | 'DIRECT_FILE_MULTIMODAL';
  rawResponseText: string;
  parsedJson: any | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number; // USD
  estimatedCostInr: number; // INR (₹)
  accuracy: JsonAccuracyReport;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  errorMessage?: string;
  timestamp: string;
}

export interface ResumeFileItem {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'zip' | 'txt';
  extractedText: string;
  base64Data?: string;
  isScannedImagePdf?: boolean;
  extractionMode: 'TEXT_PROMPT' | 'DIRECT_FILE_MULTIMODAL';
  expectedJson?: Record<string, any>;
}

export interface SampleResumeItem {
  id: string;
  title: string;
  category: string;
  rawResumeText: string;
  expectedJson: Record<string, any>;
}

export interface BatchResumeEvaluation {
  resumeFileName: string;
  extractedText: string;
  expectedJson: Record<string, any>;
  modelResults: ModelBenchmarkResult[];
}

export interface AggregateModelStats {
  modelId: string;
  modelName: string;
  providerName: string;
  avgLatencyMs: number;
  totalCost: number;
  totalCostInr: number;
  avgAccuracy: number;
  totalTokens: number;
  successCount: number;
  errorCount: number;
}

export type PriorityOption = 'BALANCED' | 'COST' | 'SPEED' | 'ACCURACY';

export interface RecommendationResult {
  recommendedModelId: string;
  recommendedModelName: string;
  reason: string;
  highlightMetric: string;
}
