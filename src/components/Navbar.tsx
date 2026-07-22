'use client';

import React from 'react';
import { Cpu, Download, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onExportResults: () => void;
  hasResults: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onExportResults,
  hasResults,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Brand / Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                AI Model Evaluator
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Server .env.local Mode</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct Benchmark for Gemini, OpenAI, Anthropic, Mistral, Vertex AI, Azure AI & AWS Bedrock
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Export Report Button */}
          {hasResults && (
            <button
              onClick={onExportResults}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Download className="h-4 w-4 text-white" />
              <span>Export Benchmark Report</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
