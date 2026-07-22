'use client';

import React from 'react';
import { Zap, IndianRupee, Target, Award } from 'lucide-react';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface SummaryCardsProps {
  results: ModelBenchmarkResult[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ results }) => {
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Overall Winner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Best Overall ATS Winner
          </span>
          <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-300">
            <Award className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h4 className="text-base font-black text-white">{overallWinner.modelName}</h4>
          <p className="text-xs text-indigo-200/80">{overallWinner.providerName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-indigo-500/20 pt-2 text-xs">
          <span className="text-slate-400">Accuracy: <strong className="text-white">{overallWinner.accuracy.overallAccuracy}%</strong></span>
          <span className="text-slate-400">Cost: <strong className="text-emerald-400">{formatINR(overallWinner.estimatedCostInr || overallWinner.estimatedCost * 86.5)}</strong></span>
        </div>
      </div>

      {/* 2. Fastest Speed */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Fastest Response Time
          </span>
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-300">
            <Zap className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h4 className="text-base font-black text-white">{fastest.modelName}</h4>
          <p className="text-xs text-amber-200/80">{fastest.providerName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-amber-500/20 pt-2 text-xs">
          <span className="text-slate-400">Latency:</span>
          <span className="font-mono font-bold text-amber-400">{formatLatency(fastest.latencyMs)}</span>
        </div>
      </div>

      {/* 3. Lowest Cost in INR */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Lowest Extraction Cost
          </span>
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h4 className="text-base font-black text-white">{cheapest.modelName}</h4>
          <p className="text-xs text-emerald-200/80">{cheapest.providerName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-emerald-500/20 pt-2 text-xs">
          <span className="text-slate-400">Cost per parse:</span>
          <span className="font-mono font-bold text-emerald-400">
            {formatINR(cheapest.estimatedCostInr || cheapest.estimatedCost * 86.5)}
          </span>
        </div>
      </div>

      {/* 4. Highest Accuracy */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Most Accurate JSON Output
          </span>
          <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-300">
            <Target className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h4 className="text-base font-black text-white">{mostAccurate.modelName}</h4>
          <p className="text-xs text-cyan-200/80">{mostAccurate.providerName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-cyan-500/20 pt-2 text-xs">
          <span className="text-slate-400">JSON Score:</span>
          <span className="font-mono font-bold text-cyan-400">{mostAccurate.accuracy.overallAccuracy}%</span>
        </div>
      </div>
    </div>
  );
};
