'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { JsonAccuracyReport, JsonDiffDetail } from '../types/benchmark';

interface JsonDiffViewerProps {
  accuracy: JsonAccuracyReport;
  modelName: string;
}

export const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({ accuracy, modelName }) => {
  if (accuracy.parseError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-300 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-sm text-red-400">
          <XCircle className="h-5 w-5 text-red-400" />
          <span>JSON Parsing Error in {modelName} Output</span>
        </div>
        <p className="text-xs font-mono bg-red-950/50 p-2 rounded border border-red-900">
          {accuracy.parseError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accuracy Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Overall Accuracy</span>
          <span className="text-lg font-extrabold text-cyan-400">{accuracy.overallAccuracy}%</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Key Match</span>
          <span className="text-lg font-extrabold text-emerald-400">{accuracy.keyMatchPercentage}%</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Value Match</span>
          <span className="text-lg font-extrabold text-purple-400">{accuracy.valueMatchPercentage}%</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Matched / Total</span>
          <span className="text-lg font-extrabold text-white">
            {accuracy.matchedKeysCount} / {accuracy.totalExpectedKeys}
          </span>
        </div>
      </div>

      {/* Field-by-Field Diff Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">JSON Key Path</th>
              <th className="py-2.5 px-3">Expected Ground Truth</th>
              <th className="py-2.5 px-3">{modelName} Generated Output</th>
              <th className="py-2.5 px-3 text-right">Similarity Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {accuracy.diffDetails.map((item, idx) => {
              let statusBadge = (
                <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Match</span>
                </span>
              );

              if (item.status === 'MISSING') {
                statusBadge = (
                  <span className="inline-flex items-center space-x-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 text-[10px]">
                    <XCircle className="h-3 w-3" />
                    <span>Missing</span>
                  </span>
                );
              } else if (item.status === 'MISMATCH') {
                statusBadge = (
                  <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Mismatch</span>
                  </span>
                );
              } else if (item.status === 'EXTRA') {
                statusBadge = (
                  <span className="inline-flex items-center space-x-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 text-[10px]">
                    <Info className="h-3 w-3" />
                    <span>Extra</span>
                  </span>
                );
              }

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-900/50 ${
                    item.status === 'MISSING'
                      ? 'bg-red-950/10'
                      : item.status === 'MISMATCH'
                      ? 'bg-amber-950/10'
                      : ''
                  }`}
                >
                  <td className="py-2 px-3">{statusBadge}</td>
                  <td className="py-2 px-3 font-semibold text-cyan-300">{item.keyPath}</td>
                  <td className="py-2 px-3 text-slate-300 max-w-xs truncate">
                    {item.expectedValue !== undefined
                      ? JSON.stringify(item.expectedValue)
                      : <span className="text-slate-600 font-sans italic">N/A</span>}
                  </td>
                  <td className="py-2 px-3 text-slate-300 max-w-xs truncate">
                    {item.actualValue !== undefined
                      ? JSON.stringify(item.actualValue)
                      : <span className="text-slate-600 font-sans italic">N/A</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-200">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        item.similarityScore >= 90
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : item.similarityScore > 50
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-red-400 bg-red-500/10'
                      }`}
                    >
                      {item.similarityScore}%
                    </span>
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
