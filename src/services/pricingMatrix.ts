import { AIModel } from '../types/benchmark';

// Current USD to INR Exchange Rate (1 USD = 86.50 INR)
export const USD_TO_INR = 86.50;

export const SUPPORTED_MODELS: AIModel[] = [
  // ----------------------------------------------------
  // 1. Google AI Direct (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    providerName: 'Google AI Direct',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    contextWindow: 1048576,
    description: 'Lightweight ultra-low cost Gemini 2.5 Flash variant for high volume.',
    defaultSimulatedLatencyMs: 320,
    accuracyMultiplier: 93,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'google',
    providerName: 'Google AI Direct',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.50,
    contextWindow: 1048576,
    description: 'Next-gen Gemini 3.1 Flash Lite for real-time document processing.',
    defaultSimulatedLatencyMs: 290,
    accuracyMultiplier: 95,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    provider: 'google',
    providerName: 'Google AI Direct',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.50,
    contextWindow: 1048576,
    description: 'Next-gen Gemini 3.5 Flash Lite model optimized for speed and cost.',
    defaultSimulatedLatencyMs: 270,
    accuracyMultiplier: 96,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    providerName: 'Google AI Direct',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inputCostPer1M: 0.30,
    outputCostPer1M: 2.50,
    contextWindow: 1048576,
    description: 'Official Google AI Gemini 2.5 Flash model for structured JSON extraction.',
    defaultSimulatedLatencyMs: 380,
    accuracyMultiplier: 96,
  },

  // ----------------------------------------------------
  // 2. OpenAI Direct (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    providerName: 'OpenAI Direct',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    contextWindow: 128000,
    description: 'Fast, lightweight model for high-frequency extraction tasks.',
    defaultSimulatedLatencyMs: 510,
    accuracyMultiplier: 94,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    providerName: 'OpenAI Direct',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    contextWindow: 128000,
    description: 'OpenAI high-intelligence flagship model with structured outputs.',
    defaultSimulatedLatencyMs: 890,
    accuracyMultiplier: 99,
  },

  // ----------------------------------------------------
  // 3. Anthropic Direct (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'claude-haiku-4-5',
    name: 'Claude 4.5 Haiku',
    provider: 'anthropic',
    providerName: 'Anthropic Direct',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
    contextWindow: 200000,
    description: 'Anthropic next-generation Claude 4.5 Haiku for ultra-fast, low-latency processing.',
    defaultSimulatedLatencyMs: 380,
    accuracyMultiplier: 93,
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude 5 Sonnet',
    provider: 'anthropic',
    providerName: 'Anthropic Direct',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    contextWindow: 200000,
    description: 'Next-gen Claude 5 Sonnet flagship model delivering supreme intelligence.',
    defaultSimulatedLatencyMs: 700,
    accuracyMultiplier: 99.7,
  },

  // ----------------------------------------------------
  // 4. Google Vertex AI (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'vertex-gemini-2.5-flash-lite',
    name: 'Vertex AI Gemini 2.5 Flash Lite',
    provider: 'vertex',
    providerName: 'Google Vertex AI',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    contextWindow: 1048576,
    description: 'Official GCP Vertex AI Gemini 2.5 Flash Lite ($0.10/1M in · $0.40/1M out).',
    defaultSimulatedLatencyMs: 340,
    accuracyMultiplier: 93.5,
  },
  {
    id: 'vertex-gemini-3.1-flash-lite',
    name: 'Vertex AI Gemini 3.1 Flash Lite',
    provider: 'vertex',
    providerName: 'Google Vertex AI',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.50,
    contextWindow: 1048576,
    description: 'Official GCP Vertex AI Gemini 3.1 Flash Lite ($0.25/1M in · $1.50/1M out).',
    defaultSimulatedLatencyMs: 310,
    accuracyMultiplier: 95,
  },
  {
    id: 'vertex-gemini-3.5-flash-lite',
    name: 'Vertex AI Gemini 3.5 Flash Lite',
    provider: 'vertex',
    providerName: 'Google Vertex AI',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.50,
    contextWindow: 1048576,
    description: 'Official GCP Vertex AI Gemini 3.5 Flash Lite ($0.25/1M in · $1.50/1M out).',
    defaultSimulatedLatencyMs: 290,
    accuracyMultiplier: 96,
  },
  {
    id: 'vertex-gemini-2.5-flash',
    name: 'Vertex AI Gemini 2.5 Flash',
    provider: 'vertex',
    providerName: 'Google Vertex AI',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    inputCostPer1M: 0.30,
    outputCostPer1M: 2.50,
    contextWindow: 1048576,
    description: 'Official GCP Vertex AI Gemini 2.5 Flash ($0.30/1M in · $2.50/1M out).',
    defaultSimulatedLatencyMs: 420,
    accuracyMultiplier: 96,
  },

  // ----------------------------------------------------
  // 5. Microsoft Azure AI Foundry (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'azure-gpt-4o-mini',
    name: 'Azure GPT-4o mini',
    provider: 'azure',
    providerName: 'Microsoft Azure AI',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    contextWindow: 128000,
    description: 'Cost-optimized Azure Foundry model for high-volume enterprise workloads.',
    defaultSimulatedLatencyMs: 490,
    accuracyMultiplier: 94,
  },
  {
    id: 'azure-gpt-4o',
    name: 'Azure GPT-4o',
    provider: 'azure',
    providerName: 'Microsoft Azure AI',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    contextWindow: 128000,
    description: 'Enterprise Azure AI Foundry OpenAI deployment with dedicated throughput.',
    defaultSimulatedLatencyMs: 780,
    accuracyMultiplier: 99,
  },

  // ----------------------------------------------------
  // 6. AWS Bedrock (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'bedrock-deepseek-v3-1',
    name: 'Bedrock DeepSeek V3.1',
    provider: 'bedrock',
    providerName: 'AWS Bedrock',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    contextWindow: 64000,
    description: 'DeepSeek-V3.1 model running on AWS Bedrock serverless infrastructure.',
    defaultSimulatedLatencyMs: 450,
    accuracyMultiplier: 98,
  },
  {
    id: 'bedrock-gemma-3-12b-it',
    name: 'Bedrock Gemma 3 12B IT',
    provider: 'bedrock',
    providerName: 'AWS Bedrock',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    inputCostPer1M: 0.07,
    outputCostPer1M: 0.14,
    contextWindow: 128000,
    description: 'Google Gemma 3 12B Instruct model running on AWS Bedrock.',
    defaultSimulatedLatencyMs: 380,
    accuracyMultiplier: 94,
  },

  // ----------------------------------------------------
  // 7. Mistral AI Direct (Sorted by lowest cost first)
  // ----------------------------------------------------
  {
    id: 'ministral-8b-latest',
    name: 'Ministral 8B',
    provider: 'mistral',
    providerName: 'Mistral AI Direct',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.10,
    contextWindow: 128000,
    description: 'Mistral AI edge-optimized model with premier performance and speed.',
    defaultSimulatedLatencyMs: 300,
    accuracyMultiplier: 91.0,
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    providerName: 'Mistral AI Direct',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.60,
    contextWindow: 128000,
    description: 'Mistral AI cost-efficient model optimized for low latency and high accuracy.',
    defaultSimulatedLatencyMs: 400,
    accuracyMultiplier: 93.5,
  },
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    providerName: 'Mistral AI Direct',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    inputCostPer1M: 2.00,
    outputCostPer1M: 6.00,
    contextWindow: 128000,
    description: 'Mistral AI flagship model with top-tier reasoning and multilingual capabilities.',
    defaultSimulatedLatencyMs: 800,
    accuracyMultiplier: 97.5,
  },
  {
    id: 'mistral-ocr-latest',
    name: 'Mistral OCR 4',
    provider: 'mistral',
    providerName: 'Mistral AI Direct',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    inputCostPer1M: 4.00,
    outputCostPer1M: 4.00,
    contextWindow: 128000,
    description: 'Mistral AI flagship OCR model. Priced at $4.00 per 1,000 pages (approx. $4.00/1M tokens).',
    defaultSimulatedLatencyMs: 1200,
    accuracyMultiplier: 98.0,
  },
];

export function calculateEstimatedCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): { costUsd: number; costInr: number } {
  const inputCostUsd = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCostUsd = (outputTokens / 1_000_000) * model.outputCostPer1M;
  const totalUsd = inputCostUsd + outputCostUsd;
  const totalInr = totalUsd * USD_TO_INR;

  return {
    costUsd: Number(totalUsd.toFixed(6)),
    costInr: Number(totalInr.toFixed(4)),
  };
}

export function formatINR(amountInr: number): string {
  if (amountInr === 0) return '₹0.00';
  if (amountInr < 0.01) return `₹${amountInr.toFixed(4)}`;
  if (amountInr < 1) return `₹${amountInr.toFixed(3)}`;
  return `₹${amountInr.toFixed(2)}`;
}

export function formatInrPer1M(amountUsd: number): string {
  const inr = amountUsd * USD_TO_INR;
  if (inr < 1) return `₹${inr.toFixed(2)}`;
  return `₹${inr.toFixed(2)}`;
}
