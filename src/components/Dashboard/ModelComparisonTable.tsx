'use client';

import React, { useState } from 'react';
import { Eye, ArrowUpDown, XCircle, FileCode, FileImage } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface ModelComparisonTableProps {
  results: ModelBenchmarkResult[];
  onSelectResult: (result: ModelBenchmarkResult) => void;
}

type SortField = 'accuracy' | 'cost' | 'latency' | 'tokens';

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  results,
  onSelectResult,
}) => {
  const [sortField, setSortField] = useState<SortField>('accuracy');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (results.length === 0) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'cost' || field === 'latency');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    switch (sortField) {
      case 'accuracy':
        valA = a.accuracy.overallAccuracy;
        valB = b.accuracy.overallAccuracy;
        break;
      case 'cost':
        valA = a.estimatedCostInr || a.estimatedCost * 86.5;
        valB = b.estimatedCostInr || b.estimatedCost * 86.5;
        break;
      case 'latency':
        valA = a.latencyMs;
        valB = b.latencyMs;
        break;
      case 'tokens':
        valA = a.totalTokens;
        valB = b.totalTokens;
        break;
    }

    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            AI Model Benchmark Matrix (Prices in Indian Rupees ₹)
          </h3>
          <p className="text-xs text-slate-400">
            Compare latency, cost per parse in ₹ (INR), input/output token usage, and JSON ground truth accuracy.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">AI Model & Cloud Provider</th>
              <th className="py-3 px-4">Extraction Mode</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('accuracy')}>
                <div className="flex items-center space-x-1">
                  <span>Accuracy Score</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('latency')}>
                <div className="flex items-center space-x-1">
                  <span>Latency</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('cost')}>
                <div className="flex items-center space-x-1">
                  <span>Parse Cost (₹ INR)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('tokens')}>
                <div className="flex items-center space-x-1">
                  <span>Tokens (In / Out / Total)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Inspect Output & Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {sortedResults.map((r, idx) => {
              const isSuccess = r.status === 'SUCCESS';
              const costInr = r.estimatedCostInr ?? r.estimatedCost * 86.5;

              return (
                <tr key={`${r.modelId}-${idx}`} className="hover:bg-slate-900/60 transition-colors">
                  {/* Model & Provider */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white font-sans text-sm">{r.modelName}</div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-medium text-slate-400 font-sans">{r.providerName}</span>
                      {r.resumeFileName && (
                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono">
                          {r.resumeFileName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Mode Badge */}
                  <td className="py-3 px-4 font-sans">
                    {r.extractionMode === 'DIRECT_FILE_MULTIMODAL' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                        <FileImage className="h-3 w-3" />
                        <span>Direct File PDF</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                        <FileCode className="h-3 w-3" />
                        <span>Text Prompt</span>
                      </span>
                    )}
                  </td>

                  {/* Accuracy Score */}
                  <td className="py-3 px-4">
                    {isSuccess ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                              r.accuracy.overallAccuracy >= 95
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : r.accuracy.overallAccuracy >= 85
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {r.accuracy.overallAccuracy}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Key: {r.accuracy.keyMatchPercentage}% · Val: {r.accuracy.valueMatchPercentage}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-red-400 text-xs flex items-center space-x-1">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>

                  {/* Latency */}
                  <td className="py-3 px-4 font-bold text-amber-300">
                    {isSuccess ? formatLatency(r.latencyMs) : '-'}
                  </td>

                  {/* Cost in Indian Rupees */}
                  <td className="py-3 px-4 font-bold text-emerald-400">
                    {isSuccess ? (
                      <div>
                        <div>{formatINR(costInr)}</div>
                        <div className="text-[9px] text-slate-500 font-sans font-normal">
                          (${r.estimatedCost.toFixed(6)})
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Tokens Breakdown */}
                  <td className="py-3 px-4 text-slate-300">
                    {isSuccess ? (
                      <div>
                        <div className="font-bold text-cyan-300">{r.totalTokens} tokens</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          In: {r.inputTokens} | Out: {r.outputTokens}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Inspect Button */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectResult(r)}
                      className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors border border-slate-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Diff</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
