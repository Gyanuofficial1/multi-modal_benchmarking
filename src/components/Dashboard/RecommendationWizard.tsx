'use client';

import React, { useState } from 'react';
import { Sparkles, Compass, Zap, IndianRupee, Target, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ModelBenchmarkResult, PriorityOption } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface RecommendationWizardProps {
  results: ModelBenchmarkResult[];
}

export const RecommendationWizard: React.FC<RecommendationWizardProps> = ({ results }) => {
  const [priority, setPriority] = useState<PriorityOption>('BALANCED');

  if (results.length === 0) return null;
  const validResults = results.filter((r) => r.status === 'SUCCESS');
  if (validResults.length === 0) return null;

  let winner: ModelBenchmarkResult = validResults[0];
  let justification = '';

  if (priority === 'SPEED') {
    winner = [...validResults].sort((a, b) => a.latencyMs - b.latencyMs)[0];
    justification = `Chosen for fastest turnaround time (${formatLatency(winner.latencyMs)}), ideal for real-time interactive ATS resume parsing.`;
  } else if (priority === 'COST') {
    winner = [...validResults].sort(
      (a, b) => (a.estimatedCostInr || a.estimatedCost * 86.5) - (b.estimatedCostInr || b.estimatedCost * 86.5)
    )[0];
    const costInrStr = formatINR(winner.estimatedCostInr || winner.estimatedCost * 86.5);
    justification = `Chosen for lowest extraction cost (${costInrStr} per resume), ideal for high-volume candidate databases.`;
  } else if (priority === 'ACCURACY') {
    winner = [...validResults].sort((a, b) => b.accuracy.overallAccuracy - a.accuracy.overallAccuracy)[0];
    justification = `Chosen for highest structural JSON accuracy score (${winner.accuracy.overallAccuracy}%), ensuring zero missing skills or contact info.`;
  } else {
    // Balanced
    const ranked = [...validResults].map((r) => {
      const acc = r.accuracy.overallAccuracy;
      const spd = Math.max(0, 100 - r.latencyMs / 30);
      const cst = Math.max(0, 100 - r.estimatedCost * 40000);
      const composite = acc * 0.5 + spd * 0.25 + cst * 0.25;
      return { ...r, composite };
    }).sort((a, b) => b.composite - a.composite);

    winner = ranked[0];
    const costInrStr = formatINR(winner.estimatedCostInr || winner.estimatedCost * 86.5);
    justification = `Optimal balance of high accuracy (${winner.accuracy.overallAccuracy}%), low latency (${formatLatency(winner.latencyMs)}), and low cost (${costInrStr}).`;
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <span>AI Model Recommendation Engine</span>
          </h3>
          <p className="text-xs text-slate-400">
            Select your enterprise business goal to get the recommended AI model and cloud provider.
          </p>
        </div>

        {/* Priority Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPriority('BALANCED')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              priority === 'BALANCED'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Balanced ATS</span>
          </button>

          <button
            onClick={() => setPriority('SPEED')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              priority === 'SPEED'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Real-Time Speed</span>
          </button>

          <button
            onClick={() => setPriority('COST')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              priority === 'COST'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Lowest Cost</span>
          </button>

          <button
            onClick={() => setPriority('ACCURACY')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              priority === 'ACCURACY'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Max Accuracy</span>
          </button>
        </div>
      </div>

      {/* Recommended Model Highlight Box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4">
        <div className="flex items-start space-x-3">
          <div className="rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-3 text-white shadow-lg shadow-cyan-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Recommended Model for {priority} Goal
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/30 font-mono">
                {winner.providerName}
              </span>
            </div>
            <h4 className="text-xl font-extrabold text-white mt-0.5">{winner.modelName}</h4>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">{justification}</p>
          </div>
        </div>

        <button
          onClick={triggerConfetti}
          className="self-start md:self-center shrink-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
        >
          Select Winner for Production
        </button>
      </div>
    </div>
  );
};
