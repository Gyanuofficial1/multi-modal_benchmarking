'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ResumeInputPanel } from '../components/ResumeInputPanel';
import { SummaryCards } from '../components/Dashboard/SummaryCards';
import { ComparisonCharts } from '../components/Dashboard/ComparisonCharts';
import { ModelComparisonTable } from '../components/Dashboard/ModelComparisonTable';
import { RecommendationWizard } from '../components/Dashboard/RecommendationWizard';
import { DetailedOutputModal } from '../components/Dashboard/DetailedOutputModal';
import { LoginScreen } from '../components/LoginScreen';
import { ModelBenchmarkResult, ProviderApiConfig, ResumeFileItem } from '../types/benchmark';
import { SUPPORTED_MODELS } from '../services/pricingMatrix';
import { benchmarkSingleModel } from '../services/aiProviders';
import { FileText, Archive } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // All results across batch of resumes
  const [allBatchResults, setAllBatchResults] = useState<ModelBenchmarkResult[]>([]);
  const [selectedResumeFilter, setSelectedResumeFilter] = useState<string>('ALL');

  const [selectedResultModal, setSelectedResultModal] = useState<ModelBenchmarkResult | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(token === 'session_active_benchmark');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  // Run Batch Multi-Model Benchmark with PARALLEL CONCURRENT execution!
  const handleRunBatchBenchmark = async (
    resumes: ResumeFileItem[],
    expectedJson: Record<string, any>,
    selectedModelIds: string[],
    systemPrompt: string
  ) => {
    setIsRunning(true);
    setAllBatchResults([]);

    const selectedModels = SUPPORTED_MODELS.filter((m) => selectedModelIds.includes(m.id));
    const cumulativeResults: ModelBenchmarkResult[] = [];

    // Loop over each resume item in the batch
    for (const resumeItem of resumes) {
      const resumeExpectedJson = resumeItem.expectedJson || expectedJson;

      // Execute all selected models concurrently in PARALLEL via secure server API route!
      const modelPromises = selectedModels.map(async (model) => {
        const result = await benchmarkSingleModel(
          model,
          resumeItem,
          resumeExpectedJson,
          {},
          systemPrompt
        );
        cumulativeResults.push(result);
        setAllBatchResults([...cumulativeResults]);
        return result;
      });

      await Promise.all(modelPromises);
    }

    setIsRunning(false);
  };

  const handleExportResults = () => {
    if (allBatchResults.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allBatchResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_model_live_benchmark_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Unique list of resume file names in the batch
  const uniqueResumeNames = Array.from(new Set(allBatchResults.map((r) => r.resumeFileName || 'Default Resume')));

  // Filtered results based on active tab
  const displayedResults =
    selectedResumeFilter === 'ALL'
      ? allBatchResults
      : allBatchResults.filter((r) => r.resumeFileName === selectedResumeFilter);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navbar */}
      <Navbar
        onExportResults={handleExportResults}
        hasResults={allBatchResults.length > 0}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6">
        {/* Input & Prompt Panel (PDF & ZIP Upload) */}
        <ResumeInputPanel
          onRunBatchBenchmark={handleRunBatchBenchmark}
          isRunning={isRunning}
        />

        {/* Results Section */}
        {allBatchResults.length > 0 && (
          <section className="space-y-8 animate-fadeIn">
            {/* Batch Filter Bar (If multiple resumes evaluated) */}
            {uniqueResumeNames.length > 1 && (
              <div className="flex items-center space-x-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 overflow-x-auto">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 shrink-0 pr-2 border-r border-slate-800">
                  <Archive className="h-4 w-4" />
                  <span>Batch Filter ({uniqueResumeNames.length} Resumes):</span>
                </div>

                <button
                  onClick={() => setSelectedResumeFilter('ALL')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold shrink-0 transition-all ${
                    selectedResumeFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Batch Resumes ({allBatchResults.length} Runs)
                </button>

                {uniqueResumeNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedResumeFilter(name)}
                    className={`rounded-lg px-3 py-1 text-xs font-mono shrink-0 transition-all flex items-center space-x-1 ${
                      selectedResumeFilter === name
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Recommendation Wizard */}
            <RecommendationWizard results={displayedResults} />

            {/* Summary Metrics Cards */}
            <SummaryCards results={displayedResults} />

            {/* Visual Charts */}
            <ComparisonCharts results={displayedResults} />

            {/* Detailed Benchmark Matrix Table */}
            <ModelComparisonTable
              results={displayedResults}
              onSelectResult={(r) => setSelectedResultModal(r)}
            />
          </section>
        )}
      </main>

      {/* Output Inspection Modal */}
      <DetailedOutputModal
        result={selectedResultModal}
        onClose={() => setSelectedResultModal(null)}
      />
    </div>
  );
}
