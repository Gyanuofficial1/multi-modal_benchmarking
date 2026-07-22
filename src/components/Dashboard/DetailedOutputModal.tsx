'use client';

import React, { useState } from 'react';
import { X, Code2, FileText, CheckCircle2 } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { JsonDiffViewer } from '../JsonDiffViewer';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface DetailedOutputModalProps {
  result: ModelBenchmarkResult | null;
  onClose: () => void;
}

export const DetailedOutputModal: React.FC<DetailedOutputModalProps> = ({
  result,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'parsed' | 'raw'>('diff');

  if (!result) return null;

  const costInr = result.estimatedCostInr ?? result.estimatedCost * 86.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">{result.modelName}</h2>
              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {result.providerName}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              Latency: <strong className="text-amber-400">{formatLatency(result.latencyMs)}</strong> · Cost: <strong className="text-emerald-400">{formatINR(costInr)}</strong> (${result.estimatedCost.toFixed(6)}) · Accuracy: <strong className="text-cyan-300">{result.accuracy.overallAccuracy}%</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Input Tokens: <strong className="text-white">{result.inputTokens}</strong> | Output Tokens: <strong className="text-white">{result.outputTokens}</strong> | Total Tokens: <strong className="text-cyan-400">{result.totalTokens}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'diff'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Field-by-Field JSON Diff</span>
          </button>

          <button
            onClick={() => setActiveTab('parsed')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'parsed'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Parsed JSON Object</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'raw'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Raw Response Text</span>
          </button>
        </div>

        {/* Modal Tab Contents */}
        <div className="overflow-y-auto pr-1 grow">
          {activeTab === 'diff' && (
            <JsonDiffViewer accuracy={result.accuracy} modelName={result.modelName} />
          )}

          {activeTab === 'parsed' && (
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-purple-200 overflow-x-auto">
              {result.parsedJson
                ? JSON.stringify(result.parsedJson, null, 2)
                : 'No valid JSON parsed'}
            </pre>
          )}

          {activeTab === 'raw' && (
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {result.rawResponseText || 'No response text available'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
