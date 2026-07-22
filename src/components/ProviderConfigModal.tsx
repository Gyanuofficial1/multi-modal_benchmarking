'use client';

import React, { useState } from 'react';
import { X, Key, ShieldCheck, Check, Server } from 'lucide-react';
import { ProviderApiConfig } from '../types/benchmark';

interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProviderApiConfig;
  onSaveConfig: (newConfig: ProviderApiConfig) => void;
}

export const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<ProviderApiConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ProviderApiConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cloud Provider API Credentials (Live Mode)</h2>
              <p className="text-xs text-slate-400">
                Configure your live API keys to evaluate models directly (stored locally in browser).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-2">
          {/* Live mode notice */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300 flex items-start space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Strict Live Mode:</strong> All evaluations execute direct live API requests against Google, OpenAI, Anthropic, Mistral, Azure, and AWS endpoints. Credentials remain private in your browser.
            </span>
          </div>

          {/* 1. Google Gemini */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Google AI (Gemini Direct API)</span>
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={formData.googleApiKey || ''}
                onChange={(e) => handleChange('googleApiKey', e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Google Vertex AI */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Google Vertex AI (GCP)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">GCP Project ID / API Key</label>
                <input
                  type="password"
                  placeholder="Vertex API Key or Project ID"
                  value={formData.vertexApiKey || ''}
                  onChange={(e) => handleChange('vertexApiKey', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Location / Region</label>
                <input
                  type="text"
                  placeholder="us-central1"
                  value={formData.vertexLocation || ''}
                  onChange={(e) => handleChange('vertexLocation', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. OpenAI Direct */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>OpenAI Direct API</span>
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">OpenAI API Key</label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={formData.openaiApiKey || ''}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Microsoft Azure AI Foundry */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Microsoft Azure AI Foundry</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Azure OpenAI Endpoint</label>
                <input
                  type="text"
                  placeholder="https://my-resource.openai.azure.com/"
                  value={formData.azureEndpoint || ''}
                  onChange={(e) => handleChange('azureEndpoint', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Azure API Key</label>
                  <input
                    type="password"
                    placeholder="azure-key-..."
                    value={formData.azureApiKey || ''}
                    onChange={(e) => handleChange('azureApiKey', e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Deployment Name</label>
                  <input
                    type="text"
                    placeholder="gpt-4o-deployment"
                    value={formData.azureDeploymentId || ''}
                    onChange={(e) => handleChange('azureDeploymentId', e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Anthropic Direct */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Anthropic Direct API</span>
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Anthropic API Key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={formData.anthropicApiKey || ''}
                onChange={(e) => handleChange('anthropicApiKey', e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 6. AWS Bedrock */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>AWS Bedrock (Amazon Web Services)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">AWS Access Key ID</label>
                <input
                  type="text"
                  placeholder="AKIA..."
                  value={formData.awsAccessKeyId || ''}
                  onChange={(e) => handleChange('awsAccessKeyId', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">AWS Secret Key</label>
                <input
                  type="password"
                  placeholder="secret-key..."
                  value={formData.awsSecretAccessKey || ''}
                  onChange={(e) => handleChange('awsSecretAccessKey', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Region</label>
                <input
                  type="text"
                  placeholder="us-east-1"
                  value={formData.awsRegion || ''}
                  onChange={(e) => handleChange('awsRegion', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 7. Mistral Direct */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Mistral AI Direct API</span>
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mistral API Key</label>
              <input
                type="password"
                placeholder="mistral-api-key..."
                value={formData.mistralApiKey || ''}
                onChange={(e) => handleChange('mistralApiKey', e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Credentials</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
