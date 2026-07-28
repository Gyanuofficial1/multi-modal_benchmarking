'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Code2, Terminal, IndianRupee, CheckCircle2 } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface BestModelCodeModalProps {
  result: ModelBenchmarkResult | null;
  onClose: () => void;
}

export const BestModelCodeModal: React.FC<BestModelCodeModalProps> = ({ result, onClose }) => {
  const [activeLang, setActiveLang] = useState<'python' | 'nodejs'>('python');
  const [copied, setCopied] = useState(false);
  const [monthlyParses, setMonthlyParses] = useState<number>(50000);

  if (!result) return null;

  const costPerParseInr = result.estimatedCostInr ?? result.estimatedCost * 86.5;
  const monthlyCostInr = costPerParseInr * monthlyParses;
  const monthlyCostUsd = result.estimatedCost * monthlyParses;

  const getPythonSnippet = (res: ModelBenchmarkResult) => {
    const p = res.provider;
    if (p === 'google' || p === 'vertex') {
      return `import os
from google import genai

# Initialize Google Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def parse_resume(file_bytes: bytes, mime_type: str = "application/pdf"):
    prompt = """
    Extract resume details into structured JSON matching this schema:
    {
      "name": "string",
      "email": "string",
      "phone": "string",
      "skills": ["string"],
      "totalExperienceYears": number,
      "education": [{"degree": "string", "institution": "string"}]
    }
    """
    
    response = client.models.generate_content(
        model="${res.modelId}",
        contents=[
            genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            prompt
        ],
        config={"response_mime_type": "application/json"}
    )
    return response.text

# Benchmark Verified Model: ${res.modelName} (${res.accuracy.overallAccuracy}% accuracy)
`;
    } else if (p === 'openai' || p === 'azure') {
      return `import os
import openai

client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def parse_resume(resume_text: str):
    response = client.chat.completions.create(
        model="${res.modelId}",
        messages=[
            {"role": "system", "content": "You are an expert ATS Resume Parser. Output JSON only."},
            {"role": "user", "content": f"Parse this resume into JSON:\\n{resume_text}"}
        ],
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

# Benchmark Verified Model: ${res.modelName} (Cost: ₹${costPerParseInr.toFixed(4)}/parse)
`;
    } else if (p === 'anthropic') {
      return `import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def parse_resume(resume_text: str):
    message = client.messages.create(
        model="${res.modelId}",
        max_tokens=2048,
        messages=[
            {"role": "user", "content": f"Parse resume into JSON:\\n{resume_text}"}
        ]
    )
    return message.content[0].text

# Benchmark Verified Model: ${res.modelName}
`;
    } else {
      return `import os
import requests

# Generic API call setup for model ${res.modelName}
def parse_resume(input_data: str):
    # API invocation logic for ${res.modelName} (${res.providerName})
    pass
`;
    }
  };

  const getNodeJsSnippet = (res: ModelBenchmarkResult) => {
    const p = res.provider;
    if (p === 'google' || p === 'vertex') {
      return `import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseResume(pdfBuffer: Buffer) {
  const response = await ai.models.generateContent({
    model: '${res.modelId}',
    contents: [
      {
        inlineData: {
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      },
      'Extract candidate profile into JSON format.',
    ],
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text);
}
// Benchmark Model: ${res.modelName} | Latency: ${formatLatency(res.latencyMs)}
`;
    } else if (p === 'openai' || p === 'azure') {
      return `import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseResume(resumeText: string) {
  const response = await openai.chat.completions.create({
    model: '${res.modelId}',
    messages: [
      { role: 'system', content: 'Output pure JSON for resume extraction.' },
      { role: 'user', content: resumeText }
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
`;
    } else {
      return `// Node.js implementation snippet for ${res.modelName} (${res.providerName})
export async function parseResume(text: string) {
  // Call ${res.modelName} endpoint
}
`;
    }
  };

  const codeSnippet = activeLang === 'python' ? getPythonSnippet(result) : getNodeJsSnippet(result);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Production Best Model Integration</h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  SELECTED WINNER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {result.modelName} by <strong className="text-cyan-400">{result.providerName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scaled Monthly Cost Calculator */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-400" />
              <span>Production Scale Cost Projection</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              Per Parse: <strong className="text-emerald-400">{formatINR(costPerParseInr)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[10000, 50000, 100000, 500000].map((volume) => (
              <button
                key={volume}
                onClick={() => setMonthlyParses(volume)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-all ${
                  monthlyParses === volume
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {(volume / 1000).toLocaleString()}k Parses/mo
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
            <span className="text-slate-400">
              Estimated monthly cost for <strong>{monthlyParses.toLocaleString()} parses</strong>:
            </span>
            <div className="text-right">
              <div className="text-base font-extrabold text-emerald-400">{formatINR(monthlyCostInr)}</div>
              <div className="text-[10px] text-slate-500 font-mono">(${monthlyCostUsd.toFixed(2)} USD)</div>
            </div>
          </div>
        </div>

        {/* Integration Code Section */}
        <div className="space-y-3 grow flex flex-col overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Code2 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">SDK Implementation Code Snippet</span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setActiveLang('python')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeLang === 'python'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveLang('nodejs')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeLang === 'nodejs'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Node.js / TS
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div className="relative grow rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-auto">
            <pre className="text-cyan-200">{codeSnippet}</pre>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Terminal className="h-3.5 w-3.5 text-slate-500" />
            <span>Benchmark Specs: {result.accuracy.overallAccuracy}% Accuracy · {formatLatency(result.latencyMs)} Latency</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
