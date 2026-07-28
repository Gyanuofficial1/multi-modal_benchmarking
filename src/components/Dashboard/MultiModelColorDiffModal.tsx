'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Crown, FileText, Search, Sparkles, Filter, Check, Layers, RefreshCw } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface MultiModelColorDiffModalProps {
  resumeFileName: string;
  modelResults: ModelBenchmarkResult[];
  onClose: () => void;
  onSelectBestModel?: (result: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
}

export const MultiModelColorDiffModal: React.FC<MultiModelColorDiffModalProps> = ({
  resumeFileName,
  modelResults,
  onClose,
}) => {
  const [searchKeyQuery, setSearchKeyQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCH' | 'MISMATCH' | 'MISSING'>('ALL');
  
  // Model selection state: 'ALL' shows all models; otherwise shows Ground Truth vs Selected Model only
  const [selectedModelId, setSelectedModelId] = useState<string | 'ALL'>('ALL');

  if (!modelResults || modelResults.length === 0) return null;

  const validResults = modelResults.filter((r) => r.status === 'SUCCESS');

  // Filtered models for table columns
  const displayedModels = selectedModelId === 'ALL'
    ? validResults
    : validResults.filter((r) => r.modelId === selectedModelId);

  // Collect all unique JSON keys across all models
  const allKeysSet = new Set<string>();
  validResults.forEach((r) => {
    if (r.accuracy && r.accuracy.diffDetails) {
      r.accuracy.diffDetails.forEach((d) => allKeysSet.add(d.keyPath));
    }
  });

  const allKeys = Array.from(allKeysSet);

  // Find overall winner for this resume
  const winnerResult = validResults.length > 0
    ? [...validResults].sort((a, b) => {
        const scoreA = a.accuracy.overallAccuracy * 0.5 + Math.max(0, 100 - a.latencyMs / 25) * 0.25;
        const scoreB = b.accuracy.overallAccuracy * 0.5 + Math.max(0, 100 - b.latencyMs / 25) * 0.25;
        return scoreB - scoreA;
      })[0]
    : null;

  // Filter keys based on search and status filter
  const filteredKeys = allKeys.filter((keyPath) => {
    const matchesSearch = keyPath.toLowerCase().includes(searchKeyQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;

    const hasStatus = displayedModels.some((r) => {
      const diffItem = r.accuracy?.diffDetails?.find((d) => d.keyPath === keyPath);
      const status = diffItem ? diffItem.status : 'MISSING';
      return status === statusFilter;
    });

    return matchesSearch && hasStatus;
  });

  const toggleModelSelection = (mId: string) => {
    if (selectedModelId === mId) {
      setSelectedModelId('ALL');
    } else {
      setSelectedModelId(mId);
    }
  };

  return (
    /* Perfectly Centered Backdrop overlay with Dark Blur */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-5 backdrop-blur-xl animate-fadeIn overflow-hidden">
      {/* Animated Full-Screen Centered Modal Window */}
      <div 
        className="relative w-[95vw] max-w-7xl h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 shadow-2xl space-y-4 flex flex-col transform transition-all duration-300 ease-out scale-100 my-auto mx-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Field Comparison: <span className="font-mono text-cyan-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-xs">{resumeFileName}</span>
                </h2>
                {selectedModelId !== 'ALL' && (
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30 font-mono">
                    1-on-1 Single AI View
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click any AI model card below to compare it 1-on-1 against Expected Ground Truth.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
            title="Close Popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Clickable Model Cards Bar (Sleek Dark Theme) */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select AI Model to Compare ({validResults.length} Available):
            </span>
            {selectedModelId !== 'ALL' && (
              <button
                onClick={() => setSelectedModelId('ALL')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset to Compare All AI Models</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {/* All Models Pill */}
            <div
              onClick={() => setSelectedModelId('ALL')}
              className={`rounded-xl border p-2 cursor-pointer transition-all flex flex-col justify-between space-y-1 text-xs ${
                selectedModelId === 'ALL'
                  ? 'border-cyan-500 bg-cyan-950/40 text-white ring-1 ring-cyan-500/40'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-extrabold text-[11px] text-cyan-300">All AI Models</div>
              <div className="text-[9px] text-slate-400 font-mono">Side-by-side</div>
            </div>

            {/* Individual Clickable Model Cards */}
            {validResults.map((r) => {
              const isWinner = winnerResult?.modelId === r.modelId;
              const isCardSelected = selectedModelId === r.modelId;
              const matched = r.accuracy.matchedKeysCount || 0;
              const total = r.accuracy.totalExpectedKeys || allKeys.length;
              const pct = Math.round((matched / (total || 1)) * 100);

              return (
                <div
                  key={r.modelId}
                  onClick={() => toggleModelSelection(r.modelId)}
                  className={`rounded-xl border p-2 space-y-1 cursor-pointer transition-all ${
                    isCardSelected
                      ? 'border-cyan-500 bg-cyan-950/40 text-white ring-1 ring-cyan-500/40'
                      : isWinner
                      ? 'border-slate-700 bg-slate-950 hover:border-slate-600'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white truncate">{r.modelName}</span>
                    {isWinner && <Crown className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                  </div>

                  {/* Score & Keys */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-extrabold text-cyan-300">
                      {r.accuracy.overallAccuracy}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {matched}/{total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Latency & Cost */}
                  <div className="text-[9px] text-slate-400 flex items-center justify-between font-mono pt-0.5 border-t border-slate-800/60">
                    <span>{formatLatency(r.latencyMs)}</span>
                    <span className="text-emerald-400">{formatINR(r.estimatedCostInr || r.estimatedCost * 86.5)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          {/* Key Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search field (e.g. phone, name)..."
              value={searchKeyQuery}
              onChange={(e) => setSearchKeyQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-semibold shrink-0 pr-1 flex items-center space-x-1 text-[10px]">
              <Filter className="h-3 w-3 text-cyan-400" />
              <span>Filter:</span>
            </span>

            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-2 py-0.5 font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Keys ({filteredKeys.length})
            </button>

            <button
              onClick={() => setStatusFilter('MATCH')}
              className={`rounded-lg px-2 py-0.5 font-bold transition-all ${
                statusFilter === 'MATCH'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              🟢 Match
            </button>

            <button
              onClick={() => setStatusFilter('MISMATCH')}
              className={`rounded-lg px-2 py-0.5 font-bold transition-all ${
                statusFilter === 'MISMATCH'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              🔴 Mismatch
            </button>

            <button
              onClick={() => setStatusFilter('MISSING')}
              className={`rounded-lg px-2 py-0.5 font-bold transition-all ${
                statusFilter === 'MISSING'
                  ? 'bg-rose-500 text-slate-950'
                  : 'bg-slate-900 text-rose-400 hover:text-rose-300 border border-slate-800'
              }`}
            >
              🟡 Missing
            </button>
          </div>
        </div>

        {/* Side-by-Side Field Comparison Table Matrix (Proper Dark Theme) */}
        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950 grow shadow-inner">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-800 min-w-[140px] bg-slate-900">
                  JSON Field Key
                </th>
                <th className="py-2.5 px-3 border-r border-slate-800 min-w-[200px] bg-slate-900 text-purple-300">
                  Expected Ground Truth
                </th>
                {displayedModels.map((r) => (
                  <th key={r.modelId} className="py-2.5 px-3 border-r border-slate-800 min-w-[180px] bg-slate-900">
                    <div className="flex items-center space-x-1">
                      <span className="text-white font-extrabold">{r.modelName}</span>
                      {winnerResult?.modelId === r.modelId && (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded font-normal border border-cyan-500/30">
                          🏆 Best
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredKeys.map((keyPath) => {
                const sampleDiff = validResults.find((r) => r.accuracy?.diffDetails?.some((d) => d.keyPath === keyPath))
                  ?.accuracy.diffDetails.find((d) => d.keyPath === keyPath);
                const expectedVal = sampleDiff ? sampleDiff.expectedValue : undefined;

                return (
                  <tr key={keyPath} className="hover:bg-slate-900/60 transition-colors group">
                    {/* JSON Key */}
                    <td className="py-2 px-3 border-r border-slate-800 font-bold text-cyan-300 bg-slate-950 group-hover:bg-slate-900/80">
                      {keyPath}
                    </td>

                    {/* Expected Ground Truth */}
                    <td className="py-2 px-3 border-r border-slate-800 text-purple-200 bg-purple-950/10 max-w-[220px] truncate">
                      {expectedVal !== undefined
                        ? JSON.stringify(expectedVal)
                        : <span className="text-slate-600 italic">null</span>}
                    </td>

                    {/* Model Value Columns */}
                    {displayedModels.map((r) => {
                      const diffItem = r.accuracy?.diffDetails?.find((d) => d.keyPath === keyPath);
                      const status = diffItem ? diffItem.status : 'MISSING';
                      const actualVal = diffItem ? diffItem.actualValue : undefined;

                      let cellBgClass = 'bg-slate-950 text-slate-400';
                      let icon = null;

                      if (status === 'MATCH') {
                        cellBgClass = 'bg-emerald-950/20 text-emerald-300 border-l-2 border-l-emerald-500';
                        icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
                      } else if (status === 'MISMATCH') {
                        cellBgClass = 'bg-amber-950/20 text-amber-300 border-l-2 border-l-amber-500';
                        icon = <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
                      } else if (status === 'MISSING') {
                        cellBgClass = 'bg-rose-950/20 text-rose-300 border-l-2 border-l-rose-500';
                        icon = <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />;
                      }

                      return (
                        <td key={r.modelId} className={`py-2 px-3 border-r border-slate-800 max-w-[200px] ${cellBgClass}`}>
                          <div className="flex items-center space-x-1.5">
                            {icon}
                            <span className="truncate text-xs font-semibold">
                              {actualVal !== undefined ? JSON.stringify(actualVal) : 'null'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
