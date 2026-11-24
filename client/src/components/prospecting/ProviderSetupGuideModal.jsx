import React from 'react';
import { X, Key, ExternalLink, Check, Copy } from 'lucide-react';

export const ProviderSetupGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Search Discovery Provider Setup</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-text-secondary leading-relaxed">
          <p>
            LINKORA natively supports <strong>Competitor Backlink Discovery</strong> using your existing Moz API integration without any extra setup.
          </p>
          <p>
            To additionally enable <strong>Keyword & Topic Web Search</strong>, you can configure either of the following official search API keys in your <code className="text-emerald-400 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">server/.env</code> file:
          </p>

          {/* Option 1: Serper.dev (Recommended) */}
          <div className="p-4 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">Option 1: Serper.dev (Recommended - 2,500 free queries)</span>
              <a
                href="https://serper.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>serper.dev</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-text-muted">
              Fastest setup. Provides 2,500 free Google search API credits upon signup.
            </p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[11px] text-emerald-400">
              SERPER_API_KEY=your_serper_api_key_here
            </div>
          </div>

          {/* Option 2: Google Custom Search */}
          <div className="p-4 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">Option 2: Google Custom Search API</span>
              <a
                href="https://developers.google.com/custom-search/v1/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>google console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-text-muted">
              Official Google Cloud search API. Free tier provides 100 queries/day.
            </p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[11px] text-purple-400 space-y-1">
              <div>GOOGLE_SEARCH_API_KEY=your_google_api_key</div>
              <div>GOOGLE_SEARCH_CX=your_programmable_engine_id</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.08] bg-[#101419] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-text-primary transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderSetupGuideModal;
