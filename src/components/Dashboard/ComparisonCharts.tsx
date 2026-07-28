'use client';

import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';
import { ModelBenchmarkResult } from '../../types/benchmark';
import { BarChart3, ScatterChart } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonChartsProps {
  results: ModelBenchmarkResult[];
}

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState<'bar' | 'scatter'>('bar');

  if (results.length === 0) return null;

  const validResults = results.filter((r) => r.status === 'SUCCESS');
  if (validResults.length === 0) return null;

  const labels = validResults.map((r) => r.modelName);

  // 1. Latency Data
  const latencyData = {
    labels,
    datasets: [
      {
        label: 'Response Time (ms)',
        data: validResults.map((r) => r.latencyMs),
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // 2. Cost Data in Indian Rupees (₹)
  const costData = {
    labels,
    datasets: [
      {
        label: 'Cost per Parse (₹ INR)',
        data: validResults.map((r) => r.estimatedCostInr || Number((r.estimatedCost * 86.5).toFixed(4))),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // 3. Accuracy Score Data
  const accuracyData = {
    labels,
    datasets: [
      {
        label: 'JSON Accuracy Score (%)',
        data: validResults.map((r) => r.accuracy.overallAccuracy),
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderColor: 'rgb(6, 182, 212)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // Scatter Plot: Latency (X) vs Accuracy (Y)
  const scatterData = {
    datasets: validResults.map((r, idx) => {
      const colors = [
        '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#f97316'
      ];
      const color = colors[idx % colors.length];
      return {
        label: r.modelName,
        data: [
          {
            x: r.latencyMs,
            y: r.accuracy.overallAccuracy,
          },
        ],
        backgroundColor: color,
        borderColor: color,
        pointRadius: 8,
        pointHoverRadius: 12,
      };
    }),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { size: 11 },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
      },
    },
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: Latency ${context.raw.x}ms, Accuracy ${context.raw.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Latency (ms) - Lower is Faster', color: '#94a3b8', font: { size: 11 } },
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      y: {
        title: { display: true, text: 'JSON Accuracy Score (%) - Higher is Better', color: '#94a3b8', font: { size: 11 } },
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* Chart View Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Visual Performance Analytics
        </h3>

        <div className="flex items-center space-x-1 rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab('bar')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              activeTab === 'bar'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bar Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('scatter')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              activeTab === 'scatter'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ScatterChart className="h-3.5 w-3.5" />
            <span>Speed vs Accuracy Scatter Plot</span>
          </button>
        </div>
      </div>

      {activeTab === 'bar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Speed Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Latency / Speed (ms)
            </h4>
            <div className="h-56">
              <Bar data={latencyData} options={chartOptions} />
            </div>
          </div>

          {/* Cost Chart in ₹ INR */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Estimated Parse Cost (₹ INR)
            </h4>
            <div className="h-56">
              <Bar data={costData} options={chartOptions} />
            </div>
          </div>

          {/* Accuracy Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              JSON Field Accuracy Score (%)
            </h4>
            <div className="h-56">
              <Bar data={accuracyData} options={chartOptions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Speed vs Accuracy Trade-off Analysis</h4>
              <p className="text-xs text-slate-400">
                Top-left quadrant represents ideal balance (Low Latency & High Accuracy).
              </p>
            </div>
          </div>

          <div className="h-80">
            <Scatter data={scatterData} options={scatterOptions} />
          </div>
        </div>
      )}
    </div>
  );
};
