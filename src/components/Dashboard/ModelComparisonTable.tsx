'use client';

import React, { useState } from 'react';
import { Eye, ArrowUpDown, XCircle, FileCode, FileImage, Search, CheckCircle2, Zap, IndianRupee, Target, Award, Check, Crown, FileText, Layers, Columns } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';
import { MultiModelColorDiffModal } from './MultiModelColorDiffModal';

interface ModelComparisonTableProps {
  results: ModelBenchmarkResult[];
  onSelectResult: (result: ModelBenchmarkResult) => void;
  onSelectBestModel?: (result: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
  selectedHeadToHeadIds?: string[];
  onToggleHeadToHead?: (modelId: string) => void;
  onOpenMultiAiDiff?: (resumeFileName: string) => void;
}

type ViewMode = 'BY_RESUME' | 'BY_MODEL';
type SortField = 'accuracy' | 'cost' | 'latency' | 'tokens' | 'rank';

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  results,
  onSelectResult,
  onSelectBestModel,
  selectedBestModelId,
  selectedHeadToHeadIds = [],
  onToggleHeadToHead,
  onOpenMultiAiDiff,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('BY_RESUME');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  if (results.length === 0) return null;

  // Grouping 1: Group by Resume File Name (1 Row Per Resume Entry)
  const uniqueResumeNames = Array.from(new Set(results.map((r) => r.resumeFileName || 'Resume')));

  const resumeSummaries = uniqueResumeNames.map((rName) => {
    const runs = results.filter((r) => r.resumeFileName === rName || (!r.resumeFileName && rName === 'Resume'));
    const successRuns = runs.filter((r) => r.status === 'SUCCESS');

    const topModel = successRuns.length > 0
      ? [...successRuns].sort((a, b) => {
          const scoreA = a.accuracy.overallAccuracy * 0.5 + Math.max(0, 100 - a.latencyMs / 25) * 0.25;
          const scoreB = b.accuracy.overallAccuracy * 0.5 + Math.max(0, 100 - b.latencyMs / 25) * 0.25;
          return scoreB - scoreA;
        })[0]
      : null;

    const avgAccuracy = successRuns.length > 0
      ? Math.round(successRuns.reduce((acc, r) => acc + r.accuracy.overallAccuracy, 0) / successRuns.length)
      : 0;

    return {
      resumeFileName: rName,
      modelRuns: runs,
      successCount: successRuns.length,
      topModel,
      avgAccuracy,
    };
  });

  // Grouping 2: Group by AI Model ID (1 Row Per AI Model)
  const uniqueModelIds = Array.from(new Set(results.map((r) => r.modelId)));

  const modelSummaries = uniqueModelIds.map((mId) => {
    const modelRuns = results.filter((r) => r.modelId === mId);
    const successRuns = modelRuns.filter((r) => r.status === 'SUCCESS');

    if (successRuns.length === 0) {
      return {
        modelId: mId,
        modelName: modelRuns[0]?.modelName || mId,
        providerName: modelRuns[0]?.providerName || '',
        provider: modelRuns[0]?.provider,
        extractionMode: modelRuns[0]?.extractionMode,
        overallAccuracy: 0,
        keyMatchPercentage: 0,
        valueMatchPercentage: 0,
        latencyMs: 0,
        estimatedCostInr: 0,
        estimatedCost: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        compositeScore: 0,
        status: 'ERROR' as const,
        representativeResult: modelRuns[0],
      };
    }

    const avgAccuracy = Math.round(
      successRuns.reduce((acc, r) => acc + r.accuracy.overallAccuracy, 0) / successRuns.length
    );
    const avgKeyMatch = Math.round(
      successRuns.reduce((acc, r) => acc + r.accuracy.keyMatchPercentage, 0) / successRuns.length
    );
    const avgValueMatch = Math.round(
      successRuns.reduce((acc, r) => acc + r.accuracy.valueMatchPercentage, 0) / successRuns.length
    );
    const avgLatency = Math.round(
      successRuns.reduce((acc, r) => acc + r.latencyMs, 0) / successRuns.length
    );
    const avgCostInr =
      successRuns.reduce((acc, r) => acc + (r.estimatedCostInr || r.estimatedCost * 86.5), 0) /
      successRuns.length;
    const avgCostUsd =
      successRuns.reduce((acc, r) => acc + r.estimatedCost, 0) / successRuns.length;
    const avgTokens = Math.round(
      successRuns.reduce((acc, r) => acc + r.totalTokens, 0) / successRuns.length
    );

    const spdScore = Math.max(0, 100 - avgLatency / 25);
    const cstScore = Math.max(0, 100 - avgCostUsd * 50000);
    const compositeScore = avgAccuracy * 0.5 + spdScore * 0.25 + cstScore * 0.25;

    return {
      modelId: mId,
      modelName: successRuns[0].modelName,
      providerName: successRuns[0].providerName,
      provider: successRuns[0].provider,
      extractionMode: successRuns[0].extractionMode,
      overallAccuracy: avgAccuracy,
      keyMatchPercentage: avgKeyMatch,
      valueMatchPercentage: avgValueMatch,
      latencyMs: avgLatency,
      estimatedCostInr: avgCostInr,
      estimatedCost: avgCostUsd,
      totalTokens: avgTokens,
      inputTokens: Math.round(successRuns.reduce((a, r) => a + r.inputTokens, 0) / successRuns.length),
      outputTokens: Math.round(successRuns.reduce((a, r) => a + r.outputTokens, 0) / successRuns.length),
      compositeScore,
      status: 'SUCCESS' as const,
      representativeResult: successRuns[0],
    };
  });

  // Filter models
  const filteredModels = modelSummaries.filter((m) => {
    const matchesSearch =
      m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'ALL' || m.providerName === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const sortedModels = [...filteredModels].sort((a, b) => {
    let valA = 0;
    let valB = 0;
    switch (sortField) {
      case 'rank':
        valA = a.compositeScore;
        valB = b.compositeScore;
        break;
      case 'accuracy':
        valA = a.overallAccuracy;
        valB = b.overallAccuracy;
        break;
      case 'cost':
        valA = a.estimatedCostInr;
        valB = b.estimatedCostInr;
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

  const validModels = modelSummaries.filter((m) => m.status === 'SUCCESS');
  const topOverallModel = [...validModels].sort((a, b) => b.compositeScore - a.compositeScore)[0];
  const fastestModel = [...validModels].sort((a, b) => a.latencyMs - b.latencyMs)[0];
  const cheapestModel = [...validModels].sort((a, b) => a.estimatedCostInr - b.estimatedCostInr)[0];
  const mostAccurateModel = [...validModels].sort((a, b) => b.overallAccuracy - a.overallAccuracy)[0];

  const uniqueProviders = Array.from(new Set(results.map((r) => r.providerName)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'cost' || field === 'latency');
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-md">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Award className="h-4 w-4 text-cyan-400" />
              <span>AI Model Benchmark Matrix</span>
            </h3>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
              <button
                onClick={() => setViewMode('BY_RESUME')}
                className={`flex items-center space-x-1 rounded-md px-2.5 py-1 font-bold transition-all ${
                  viewMode === 'BY_RESUME'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>By Resume ({resumeSummaries.length} Entries)</span>
              </button>

              <button
                onClick={() => setViewMode('BY_MODEL')}
                className={`flex items-center space-x-1 rounded-md px-2.5 py-1 font-bold transition-all ${
                  viewMode === 'BY_MODEL'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>By AI Leaderboard ({modelSummaries.length} Models)</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {viewMode === 'BY_RESUME'
              ? `Showing ${resumeSummaries.length} resume entry/entries. Click 'Compare All AI Diff' to see side-by-side color key matches.`
              : `Showing aggregate model rankings across all evaluated resumes.`}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Mode 1: BY RESUME VIEW (1 Entry Per Uploaded Resume) */}
      {viewMode === 'BY_RESUME' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Uploaded Resume File</th>
                  <th className="py-2.5 px-3">Evaluated Models</th>
                  <th className="py-2.5 px-4">🏆 Winner AI Model for this Resume</th>
                  <th className="py-2.5 px-3">Accuracy Score</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Cost (₹)</th>
                  <th className="py-2.5 px-4 text-right">Multi-AI Diff & Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {resumeSummaries.map((res, idx) => {
                  const winner = res.topModel;
                  const isSelected = winner && selectedBestModelId === winner.modelId;

                  return (
                    <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                      {/* Resume Name */}
                      <td className="py-3 px-4 font-bold text-white font-sans flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span className="truncate">{res.resumeFileName}</span>
                      </td>

                      {/* Evaluated Models Count */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {res.modelRuns.length} AI Models
                        </span>
                      </td>

                      {/* Winner Model */}
                      <td className="py-3 px-4 font-sans">
                        {winner ? (
                          <div>
                            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              <span>{winner.modelName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{winner.providerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No winner</span>
                        )}
                      </td>

                      {/* Accuracy Score */}
                      <td className="py-3 px-3 font-bold text-cyan-300">
                        {winner ? `${winner.accuracy.overallAccuracy}%` : '-'}
                      </td>

                      {/* Speed */}
                      <td className="py-3 px-3 font-bold text-amber-300">
                        {winner ? formatLatency(winner.latencyMs) : '-'}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {winner ? formatINR(winner.estimatedCostInr || winner.estimatedCost * 86.5) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right font-sans">
                        {/* Open Multi-AI Color Diff Button */}
                        <button
                          onClick={() => onOpenMultiAiDiff?.(res.resumeFileName)}
                          className="inline-flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-90 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-cyan-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <Columns className="h-3.5 w-3.5 text-cyan-300" />
                          <span>Compare All AI Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode 2: BY AI LEADERBOARD VIEW (1 Row Per Model) */}
      {viewMode === 'BY_MODEL' && (
        <div className="space-y-3">
          {/* Cloud Provider Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold shrink-0 text-[11px]">Provider:</span>
            <button
              onClick={() => setProviderFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-all ${
                providerFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({modelSummaries.length} Models)
            </button>
            {uniqueProviders.map((prov) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(prov)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-all ${
                  providerFilter === prov
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">H2H</th>
                  <th className="py-2.5 px-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort('rank')}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>Rank</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">AI Model & Provider</th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('accuracy')}>
                    <div className="flex items-center space-x-1">
                      <span>Accuracy Score</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('latency')}>
                    <div className="flex items-center space-x-1">
                      <span>Latency</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('cost')}>
                    <div className="flex items-center space-x-1">
                      <span>Parse Cost (₹ INR)</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('tokens')}>
                    <div className="flex items-center space-x-1">
                      <span>Tokens</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-right">Select Winner Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {sortedModels.map((m, idx) => {
                  const isSuccess = m.status === 'SUCCESS';
                  const isBest = selectedBestModelId === m.modelId;
                  const isCheckedH2H = selectedHeadToHeadIds.includes(m.modelId);

                  const isTopOverall = topOverallModel?.modelId === m.modelId;
                  const isFastest = fastestModel?.modelId === m.modelId;
                  const isCheapest = cheapestModel?.modelId === m.modelId;
                  const isAccurate = mostAccurateModel?.modelId === m.modelId;

                  return (
                    <tr
                      key={m.modelId}
                      className={`transition-colors ${
                        isBest || isTopOverall
                          ? 'bg-emerald-950/20 border-l-4 border-l-emerald-400 hover:bg-emerald-950/30'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* H2H Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isCheckedH2H}
                          onChange={() => onToggleHeadToHead && onToggleHeadToHead(m.modelId)}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Rank Badge */}
                      <td className="py-2.5 px-3 text-center font-sans font-extrabold">
                        {idx === 0 ? (
                          <span className="inline-flex items-center space-x-1 text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 text-xs">
                            <Crown className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span>#1</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">#{idx + 1}</span>
                        )}
                      </td>

                      {/* AI Model & Provider */}
                      <td className="py-2.5 px-4 font-sans">
                        <div className="flex items-center space-x-2">
                          <div className="font-bold text-white text-sm">{m.modelName}</div>
                          {isTopOverall && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40 flex items-center space-x-1">
                              <Check className="h-2.5 w-2.5" />
                              <span>BEST MODEL</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-medium text-slate-400">{m.providerName}</span>

                          {/* Rank Badges */}
                          {isFastest && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                              ⚡ #1 Speed
                            </span>
                          )}
                          {isCheapest && (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              💰 #1 Cost
                            </span>
                          )}
                          {isAccurate && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">
                              🎯 #1 Accuracy
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Accuracy Score */}
                      <td className="py-2.5 px-3">
                        {isSuccess ? (
                          <div className="space-y-0.5">
                            <span
                              className={`text-xs font-extrabold px-2 py-0.5 rounded inline-block ${
                                m.overallAccuracy >= 95
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : m.overallAccuracy >= 85
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}
                            >
                              {m.overallAccuracy}%
                            </span>
                            <div className="text-[9px] text-slate-400 font-sans">
                              Key: {m.keyMatchPercentage}% | Val: {m.valueMatchPercentage}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-400 text-xs flex items-center space-x-1">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      {/* Response Latency */}
                      <td className="py-2.5 px-3 font-bold text-amber-300">
                        {isSuccess ? formatLatency(m.latencyMs) : '-'}
                      </td>

                      {/* Cost in ₹ INR */}
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {isSuccess ? (
                          <div>
                            <div>{formatINR(m.estimatedCostInr)}</div>
                            <div className="text-[9px] text-slate-500 font-sans font-normal">
                              (${m.estimatedCost.toFixed(6)})
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Total Tokens */}
                      <td className="py-2.5 px-3 text-slate-300">
                        {isSuccess ? (
                          <div>
                            <div className="font-bold text-cyan-300">{m.totalTokens}</div>
                            <div className="text-[9px] text-slate-400 font-sans">
                              In: {m.inputTokens} | Out: {m.outputTokens}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => onSelectResult(m.representativeResult)}
                          className="inline-flex items-center space-x-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
                          title="Inspect field-by-field JSON output"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Diff</span>
                        </button>

                        {onSelectBestModel && (
                          <button
                            onClick={() => onSelectBestModel(m.representativeResult)}
                            className={`inline-flex items-center space-x-1 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                              isBest || isTopOverall
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isBest ? 'Production Best' : 'Select Model'}</span>
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
      )}
    </div>
  );
};
