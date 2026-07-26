'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Globe, ArrowRight } from 'lucide-react';

export default function RedirectionPage() {
  const [status, setStatus] = useState<string>('Detecting device...');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isAndroid) {
      setStatus('Redirecting to Google Play Store / App...');
      
      // Attempt to launch via Android Intent URI
      // This will open the app if installed, or fall back to the Play Store URL
      const intentUri = `intent://#Intent;scheme=talentwale;package=com.talentwale.jobseeker;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.talentwale.jobseeker;end`;
      
      // Delay slightly for better visual feedback
      const timer = setTimeout(() => {
        window.location.href = intentUri;
      }, 800);
      
      return () => clearTimeout(timer);
    } else if (isIOS) {
      setStatus('Opening Talentwale on iOS...');
      
      const appStoreUrl = 'https://apps.apple.com/in/app/talentwale-candidate/id6752120066';
      
      // Attempt custom scheme first, then fallback to App Store if app not installed
      const startTime = Date.now();
      window.location.href = 'talentwale://';
      
      const timer = setTimeout(() => {
        // If browser was not backgrounded (app not opened), redirect to App Store
        if (Date.now() - startTime < 2000) {
          window.location.href = appStoreUrl;
        }
      }, 1200);
      
      return () => clearTimeout(timer);
    } else {
      setStatus('Redirecting to Talentwale Website...');
      
      // Redirect to desktop login
      const timer = setTimeout(() => {
        window.location.href = 'http://talentwale.com/login';
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-1/3 left-1/3 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl text-center z-10 relative">
        {/* Glowing top border indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

        {/* Brand Header */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 mb-4 shadow-inner shadow-cyan-500/10 animate-bounce duration-1000">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Talentwale</h1>
          <p className="text-slate-400 text-sm mt-1">Connecting Careers & Candidates</p>
        </div>

        {/* Dynamic Status / Loader */}
        <div className="mb-10">
          <div className="flex items-center justify-center space-x-2 text-cyan-400 font-medium mb-3">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>{status}</span>
          </div>
          <p className="text-slate-500 text-xs px-4">
            If you are not redirected automatically in a few seconds, please choose your platform manually below.
          </p>
        </div>

        {/* Fallback & Platform Options */}
        <div className="space-y-3 text-left">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Manual Options
          </h3>

          {/* Android Button */}
          <a
            href="intent://#Intent;scheme=talentwale;package=com.talentwale.jobseeker;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.talentwale.jobseeker;end"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/30 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-green-950/30 border border-green-500/20 text-green-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-200">Open on Android</div>
                <div className="text-xs text-slate-500">Google Play Store</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </a>

          {/* iOS Button */}
          <a
            href="https://apps.apple.com/in/app/talentwale-candidate/id6752120066"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/30 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-950/30 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-200">Open on iOS</div>
                <div className="text-xs text-slate-500">Apple App Store</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </a>

          {/* Web Button */}
          <a
            href="http://talentwale.com/login"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/30 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-purple-950/30 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-200">Open Website</div>
                <div className="text-xs text-slate-500">Desktop Web Login</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}
