'use client';

import React from 'react';
import { X, Zap, IndianRupee, Target, Award, CheckCircle2, FileCode, Check } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface HeadToHeadComparisonProps {
  selectedResults: ModelBenchmarkResult[];
  onClose: () => void;
  onSelectBestModel: (model: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
}

export const HeadToHeadComparison: React.FC<HeadToHeadComparisonProps> = ({
  selectedResults,
  onClose,
  onSelectBestModel,
  selectedBestModelId,
}) => {
  if (selectedResults.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4">
          <h3 className="text-lg font-bold text-white">Select Models to Compare</h3>
          <p className="text-xs text-slate-400">
            Please select at least 2 models from the benchmark table to view a head-to-head side-by-side analysis.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Determine winners
  const validResults = selectedResults.filter((r) => r.status === 'SUCCESS');

  const fastest = [...validResults].sort((a, b) => a.latencyMs - b.latencyMs)[0];
  const cheapest = [...validResults].sort(
    (a, b) => (a.estimatedCostInr || a.estimatedCost * 86.5) - (b.estimatedCostInr || b.estimatedCost * 86.5)
  )[0];
  const mostAccurate = [...validResults].sort(
    (a, b) => b.accuracy.overallAccuracy - a.accuracy.overallAccuracy
  )[0];

  // Extract all unique key paths from diffDetails
  const allKeyPathsSet = new Set<string>();
  selectedResults.forEach((res) => {
    res.accuracy.diffDetails.forEach((d) => allKeyPathsSet.add(d.keyPath));
  });
  const allKeyPaths = Array.from(allKeyPathsSet);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-extrabold text-white">Head-to-Head AI Model Comparison</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side analysis comparing performance, accuracy, latency, cost in ₹ INR, and JSON output quality.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side by Side Model Columns */}
        <div className="overflow-y-auto grow space-y-6 pr-1">
          <div className={`grid grid-cols-1 md:grid-cols-${selectedResults.length} gap-4`}>
            {selectedResults.map((r) => {
              const isBest = selectedBestModelId === r.modelId;
              const isFastest = fastest?.modelId === r.modelId;
              const isCheapest = cheapest?.modelId === r.modelId;
              const isAccurate = mostAccurate?.modelId === r.modelId;
              const costInr = r.estimatedCostInr ?? r.estimatedCost * 86.5;

              return (
                <div
                  key={r.modelId}
                  className={`rounded-2xl border p-4 space-y-4 transition-all relative ${
                    isBest
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/80'
                  }`}
                >
                  {/* Model Title & Provider */}
                  <div className="space-y-1 border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-cyan-400">{r.providerName}</span>
                      {isBest && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                          <Check className="h-3 w-3" />
                          <span>SELECTED BEST</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-white">{r.modelName}</h3>
                  </div>

                  {/* Category Winners Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {isFastest && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                        <Zap className="h-3 w-3" />
                        <span>Speed Winner</span>
                      </span>
                    )}
                    {isCheapest && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                        <IndianRupee className="h-3 w-3" />
                        <span>Lowest Cost</span>
                      </span>
                    )}
                    {isAccurate && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
                        <Target className="h-3 w-3" />
                        <span>Max Accuracy</span>
                      </span>
                    )}
                  </div>

                  {/* Key Metrics Breakdown */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400">Accuracy Score</span>
                      <span className="font-extrabold text-cyan-300">{r.accuracy.overallAccuracy}%</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400">Response Latency</span>
                      <span className="font-bold text-amber-400">{formatLatency(r.latencyMs)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400">Cost per Parse</span>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">{formatINR(costInr)}</div>
                        <div className="text-[9px] text-slate-500">(${r.estimatedCost.toFixed(6)})</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400">Total Tokens</span>
                      <span className="font-mono text-slate-200">{r.totalTokens}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                      <span className="text-slate-400">100k Parses/mo</span>
                      <span className="font-extrabold text-emerald-400">{formatINR(costInr * 100000)}</span>
                    </div>
                  </div>

                  {/* Select as Winner Action */}
                  <button
                    onClick={() => onSelectBestModel(r)}
                    className={`w-full rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      isBest
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isBest ? 'Production Best Model' : 'Select as Best Model'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Field by Field Side by Side Output Comparison Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FileCode className="h-4 w-4 text-cyan-400" />
              <span>Side-by-Side Field Extraction Comparison</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">JSON Field Key</th>
                    {selectedResults.map((r) => (
                      <th key={r.modelId} className="py-2.5 px-3 font-bold text-cyan-300">
                        {r.modelName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allKeyPaths.map((keyPath) => (
                    <tr key={keyPath} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 text-cyan-400 font-semibold">{keyPath}</td>
                      {selectedResults.map((r) => {
                        const detail = r.accuracy.diffDetails.find((d) => d.keyPath === keyPath);
                        if (!detail) {
                          return (
                            <td key={r.modelId} className="py-2 px-3 text-slate-600 italic font-sans text-[11px]">
                              N/A
                            </td>
                          );
                        }
                        const isMatch = detail.status === 'MATCH';
                        return (
                          <td key={r.modelId} className="py-2 px-3">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  isMatch ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              ></span>
                              <span className={isMatch ? 'text-slate-200' : 'text-amber-300 font-semibold'}>
                                {detail.actualValue !== undefined ? JSON.stringify(detail.actualValue) : 'Missing'}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 pt-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-bold text-white transition-colors"
          >
            Close Comparison View
          </button>
        </div>
      </div>
    </div>
  );
};
