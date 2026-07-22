'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ModelBenchmarkResult } from '../../types/benchmark';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonChartsProps {
  results: ModelBenchmarkResult[];
}

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Speed Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Latency / Speed (ms)
        </h3>
        <div className="h-56">
          <Bar data={latencyData} options={chartOptions} />
        </div>
      </div>

      {/* Cost Chart in ₹ INR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Estimated Parse Cost (₹ INR)
        </h3>
        <div className="h-56">
          <Bar data={costData} options={chartOptions} />
        </div>
      </div>

      {/* Accuracy Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          JSON Field Accuracy Score (%)
        </h3>
        <div className="h-56">
          <Bar data={accuracyData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};
