'use client';

import React from 'react';
import { Zap, IndianRupee, Target, Award, CheckCircle2 } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface SummaryCardsProps {
  results: ModelBenchmarkResult[];
  onSelectBestModel?: (result: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  results,
  onSelectBestModel,
  selectedBestModelId,
}) => {
  if (results.length === 0) return null;

  const validResults = results.filter((r) => r.status === 'SUCCESS');
  if (validResults.length === 0) return null;

  // 1. Fastest Model (Lowest Latency)
  const fastest = [...validResults].sort((a, b) => a.latencyMs - b.latencyMs)[0];

  // 2. Cheapest Model (Lowest Estimated Cost)
  const cheapest = [...validResults].sort(
    (a, b) => (a.estimatedCostInr || a.estimatedCost * 86.5) - (b.estimatedCostInr || b.estimatedCost * 86.5)
  )[0];

  // 3. Most Accurate Model (Highest Overall Accuracy %)
  const mostAccurate = [...validResults].sort(
    (a, b) => b.accuracy.overallAccuracy - a.accuracy.overallAccuracy
  )[0];

  // 4. Best Overall Resume Parser
  const sortedByRank = [...validResults].map((item) => {
    const accuracyScore = item.accuracy.overallAccuracy;
    const speedScore = Math.max(0, 100 - item.latencyMs / 25);
    const costScore = Math.max(0, 100 - item.estimatedCost * 50000);
    const compositeScore = accuracyScore * 0.5 + speedScore * 0.25 + costScore * 0.25;
    return { ...item, compositeScore };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  const overallWinner = sortedByRank[0];

  const renderCard = (
    title: string,
    model: ModelBenchmarkResult,
    icon: React.ReactNode,
    borderColor: string,
    accentColor: string,
    metricText: React.ReactNode
  ) => {
    const isSelected = selectedBestModelId === model.modelId;

    return (
      <div
        onClick={() => onSelectBestModel && onSelectBestModel(model)}
        className={`relative overflow-hidden rounded-xl border p-3 shadow-md transition-all cursor-pointer group ${
          isSelected
            ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/50'
            : `${borderColor} bg-slate-900/60 hover:border-cyan-500/50`
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${accentColor}`}>
            {title}
          </span>
          <div className="rounded-lg bg-slate-800/80 p-1.5 text-white group-hover:scale-105 transition-transform">
            {icon}
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <div className="flex items-center space-x-1.5">
            <h4 className="text-sm font-extrabold text-white truncate">{model.modelName}</h4>
            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
          </div>
          <p className="text-[11px] text-slate-400">{model.providerName}</p>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-xs font-mono">
          {metricText}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Overall Winner */}
      {renderCard(
        'Best Overall Winner',
        overallWinner,
        <Award className="h-5 w-5 text-indigo-400" />,
        'border-indigo-500/30',
        'text-indigo-400',
        <>
          <span className="text-slate-400">Score: <strong className="text-white">{overallWinner.accuracy.overallAccuracy}%</strong></span>
          <span className="text-slate-400">Cost: <strong className="text-emerald-400">{formatINR(overallWinner.estimatedCostInr || overallWinner.estimatedCost * 86.5)}</strong></span>
        </>
      )}

      {/* 2. Fastest Speed */}
      {renderCard(
        'Fastest Speed',
        fastest,
        <Zap className="h-5 w-5 text-amber-400" />,
        'border-amber-500/30',
        'text-amber-400',
        <>
          <span className="text-slate-400">Latency:</span>
          <span className="font-mono font-bold text-amber-400">{formatLatency(fastest.latencyMs)}</span>
        </>
      )}

      {/* 3. Lowest Cost in INR */}
      {renderCard(
        'Lowest Parse Cost',
        cheapest,
        <IndianRupee className="h-5 w-5 text-emerald-400" />,
        'border-emerald-500/30',
        'text-emerald-400',
        <>
          <span className="text-slate-400">Cost per parse:</span>
          <span className="font-mono font-bold text-emerald-400">
            {formatINR(cheapest.estimatedCostInr || cheapest.estimatedCost * 86.5)}
          </span>
        </>
      )}

      {/* 4. Highest Accuracy */}
      {renderCard(
        'Max Accuracy',
        mostAccurate,
        <Target className="h-5 w-5 text-cyan-400" />,
        'border-cyan-500/30',
        'text-cyan-400',
        <>
          <span className="text-slate-400">JSON Score:</span>
          <span className="font-mono font-bold text-cyan-400">{mostAccurate.accuracy.overallAccuracy}%</span>
        </>
      )}
    </div>
  );
};
