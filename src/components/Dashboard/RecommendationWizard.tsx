'use client';

import React, { useState } from 'react';
import { Sparkles, Compass, Zap, IndianRupee, Target, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ModelBenchmarkResult, PriorityOption } from '../../types/benchmark';
import { formatINR, formatLatency } from '../../services/pricingMatrix';

interface RecommendationWizardProps {
  results: ModelBenchmarkResult[];
  onSelectBestModel?: (result: ModelBenchmarkResult) => void;
  selectedBestModelId?: string | null;
}

export const RecommendationWizard: React.FC<RecommendationWizardProps> = ({
  results,
  onSelectBestModel,
  selectedBestModelId,
}) => {
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

  const isAlreadySelected = selectedBestModelId === winner.modelId;

  const handleSelectWinner = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
    if (onSelectBestModel) {
      onSelectBestModel(winner);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-md space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>AI Model Recommendation Engine</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Select your enterprise business goal to get the recommended AI model.
          </p>
        </div>

        {/* Priority Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => setPriority('BALANCED')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              priority === 'BALANCED'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Balanced ATS</span>
          </button>

          <button
            onClick={() => setPriority('SPEED')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              priority === 'SPEED'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Speed</span>
          </button>

          <button
            onClick={() => setPriority('COST')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              priority === 'COST'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Lowest Cost</span>
          </button>

          <button
            onClick={() => setPriority('ACCURACY')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              priority === 'ACCURACY'
                ? 'bg-purple-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Accuracy</span>
          </button>
        </div>
      </div>

      {/* Recommended Model Highlight Box */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
        isAlreadySelected
          ? 'border-emerald-500/50 bg-emerald-950/20'
          : 'border-cyan-500/30 bg-cyan-950/20'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-2 text-white shadow-sm shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                Top Model for {priority} Goal
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] text-cyan-300 border border-cyan-500/30 font-mono">
                {winner.providerName}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-white">{winner.modelName}</h4>
            <p className="text-xs text-slate-300">{justification}</p>
          </div>
        </div>

        <button
          onClick={handleSelectWinner}
          className={`self-start md:self-center shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1 ${
            isAlreadySelected
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{isAlreadySelected ? 'Selected Winner' : 'Select Winner'}</span>
        </button>
      </div>
    </div>
  );
};
