'use client';

import React, { useState } from 'react';
import { Eye, ArrowUpDown, XCircle, FileCode, FileImage, Search, CheckCircle2, Zap, IndianRupee, Target, Award, Check } from 'lucide-react';
import { ModelBenchmarkResult, ProviderId } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface ModelComparisonTableProps {
  results: ModelBenchmarkResult[];
  onSelectResult: (result: ModelBenchmarkResult) => void;
  onSelectBestModel?: (result: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
  selectedHeadToHeadIds?: string[];
  onToggleHeadToHead?: (modelId: string) => void;
}

type SortField = 'accuracy' | 'cost' | 'latency' | 'tokens';

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  results,
  onSelectResult,
  onSelectBestModel,
  selectedBestModelId,
  selectedHeadToHeadIds = [],
  onToggleHeadToHead,
}) => {
  const [sortField, setSortField] = useState<SortField>('accuracy');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  if (results.length === 0) return null;

  const validResults = results.filter((r) => r.status === 'SUCCESS');
  const fastestId = validResults.length > 0 ? [...validResults].sort((a, b) => a.latencyMs - b.latencyMs)[0]?.modelId : null;
  const cheapestId = validResults.length > 0 ? [...validResults].sort((a, b) => (a.estimatedCostInr || a.estimatedCost * 86.5) - (b.estimatedCostInr || b.estimatedCost * 86.5))[0]?.modelId : null;
  const mostAccurateId = validResults.length > 0 ? [...validResults].sort((a, b) => b.accuracy.overallAccuracy - a.accuracy.overallAccuracy)[0]?.modelId : null;

  const uniqueProviders = Array.from(new Set(results.map((r) => r.providerName)));

  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'ALL' || r.providerName === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'cost' || field === 'latency');
    }
  };

  const sortedResults = [...filteredResults].sort((a, b) => {
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
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Award className="h-5 w-5 text-cyan-400" />
            <span>AI Model Benchmark Matrix (Prices in ₹ INR)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Compare performance metrics, pick head-to-head models, and select your winning production AI model.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search model or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Cloud Provider Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold shrink-0">Filter Provider:</span>
        <button
          onClick={() => setProviderFilter('ALL')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-all ${
            providerFilter === 'ALL'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All ({results.length})
        </button>
        {uniqueProviders.map((prov) => (
          <button
            key={prov}
            onClick={() => setProviderFilter(prov)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-all ${
              providerFilter === prov
                ? 'bg-indigo-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {prov}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 w-10 text-center">Compare</th>
              <th className="py-3 px-4">AI Model & Provider</th>
              <th className="py-3 px-3">Mode</th>
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
                  <span>Tokens (In/Out/Total)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions & Selection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {sortedResults.map((r, idx) => {
              const isSuccess = r.status === 'SUCCESS';
              const costInr = r.estimatedCostInr ?? r.estimatedCost * 86.5;
              const isBest = selectedBestModelId === r.modelId;
              const isCheckedH2H = selectedHeadToHeadIds.includes(r.modelId);

              const isFastest = fastestId === r.modelId;
              const isCheapest = cheapestId === r.modelId;
              const isAccurate = mostAccurateId === r.modelId;

              return (
                <tr
                  key={`${r.modelId}-${idx}`}
                  className={`transition-colors ${
                    isBest
                      ? 'bg-emerald-950/20 border-l-4 border-l-emerald-400 hover:bg-emerald-950/30'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Checkbox for Head-to-Head */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isCheckedH2H}
                      onChange={() => onToggleHeadToHead && onToggleHeadToHead(r.modelId)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>

                  {/* Model & Provider */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="font-bold text-white font-sans text-sm">{r.modelName}</div>
                      {isBest && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40 font-sans flex items-center space-x-1">
                          <Check className="h-2.5 w-2.5" />
                          <span>BEST</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-medium text-slate-400 font-sans">{r.providerName}</span>

                      {/* Rank Badges */}
                      {isFastest && (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 font-sans">
                          ⚡ #1 Speed
                        </span>
                      )}
                      {isCheapest && (
                        <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30 font-sans">
                          💰 #1 Cost
                        </span>
                      )}
                      {isAccurate && (
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30 font-sans">
                          🎯 #1 Accuracy
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Mode Badge */}
                  <td className="py-3 px-3 font-sans">
                    {r.extractionMode === 'DIRECT_FILE_MULTIMODAL' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                        <FileImage className="h-3 w-3" />
                        <span>Direct PDF</span>
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
                            className={`text-xs font-extrabold px-2 py-0.5 rounded ${
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
                        <div className="font-bold text-cyan-300">{r.totalTokens}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          In: {r.inputTokens} | Out: {r.outputTokens}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Actions & Select Best Model */}
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectResult(r)}
                      className="inline-flex items-center space-x-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
                      title="Inspect field-by-field JSON output"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Diff</span>
                    </button>

                    {onSelectBestModel && (
                      <button
                        onClick={() => onSelectBestModel(r)}
                        className={`inline-flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          isBest
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isBest ? 'Production Best' : 'Select'}</span>
                      </button>
                    )}
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
