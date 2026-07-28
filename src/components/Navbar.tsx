import React from 'react';
import { Cpu, Download, ShieldCheck, LogOut, History, Database } from 'lucide-react';

interface NavbarProps {
  onExportResults: () => void;
  hasResults: boolean;
  onLogout?: () => void;
  historicalRuns?: any[];
  selectedRunId?: string;
  onLoadRun?: (runId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onExportResults,
  hasResults,
  onLogout,
  historicalRuns = [],
  selectedRunId = '',
  onLoadRun,
}) => {
  const formatDate = (epochMs: number) => {
    try {
      const d = new Date(epochMs);
      return d.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Unknown Date';
    }
  };

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

        {/* Center/Right: History Dropdown & Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Historical Runs Dropdown */}
          <div className="hidden md:flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs">
            <History className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedRunId}
              onChange={(e) => onLoadRun?.(e.target.value)}
              className="bg-transparent text-slate-300 font-bold border-none outline-none focus:ring-0 max-w-[200px] cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-slate-400">
                {historicalRuns.length > 0 ? '🕒 Load Past Runs...' : '🕒 No Past Runs'}
              </option>
              {historicalRuns.map((run) => (
                <option key={run.runId} value={run.runId} className="bg-slate-950 text-slate-200">
                  {formatDate(run.timestamp)} ({run.resumesCount} files × {run.modelsCount} AI)
                </option>
              ))}
            </select>
            {selectedRunId && (
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.2 text-[9px] font-bold text-cyan-300 border border-cyan-500/20 flex items-center space-x-1 shrink-0">
                <Database className="h-2 w-2" />
                <span>Loaded</span>
              </span>
            )}
          </div>

          {/* Export Report Button */}
          {hasResults && (
            <button
              onClick={onExportResults}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Download className="h-4 w-4 text-white" />
              <span>Export Report</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
