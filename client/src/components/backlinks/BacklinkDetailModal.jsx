import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Globe,
  Link2,
  ShieldCheck,
  ShieldAlert,
  Award,
  Layers,
  Database
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const BacklinkDetailModal = ({ backlink, isOpen, onClose }) => {
  const { addToast } = useToast();
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !backlink) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast(`Copied ${fieldName} to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isDofollow = backlink.linkType?.toLowerCase() === 'dofollow';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl surface-card rounded-2xl border border-white/[0.1] shadow-elevated overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#101318]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-tight">
                  {backlink.sourceDomain || 'Backlink Details'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isDofollow
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {backlink.linkType || 'unknown'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 font-mono">
                ID: {backlink.id || backlink._id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-xs">
          {/* Section 1: Source & Target URLs */}
          <div className="space-y-3.5">
            {/* Source URL */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Linking Page (Source URL)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(backlink.sourceUrl, 'Source URL')}
                    className="flex items-center gap-1 hover:text-text-primary transition-colors text-[11px]"
                  >
                    {copiedField === 'Source URL' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                  <a
                    href={backlink.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-emerald-400 transition-colors text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
              <p className="font-mono text-xs text-text-primary break-all select-all leading-relaxed">
                {backlink.sourceUrl}
              </p>
            </div>

            {/* Target URL */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Landing Page (Target URL)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(backlink.targetUrl, 'Target URL')}
                    className="flex items-center gap-1 hover:text-text-primary transition-colors text-[11px]"
                  >
                    {copiedField === 'Target URL' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                  <a
                    href={backlink.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-emerald-400 transition-colors text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
              <p className="font-mono text-xs text-text-primary break-all select-all leading-relaxed">
                {backlink.targetUrl}
              </p>
            </div>
          </div>

          {/* Section 2: Anchor Text */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
            <div className="flex items-center justify-between text-text-muted text-[11px]">
              <span className="font-semibold uppercase tracking-wider">Anchor Text</span>
              {backlink.anchorText && (
                <button
                  onClick={() => handleCopy(backlink.anchorText, 'Anchor Text')}
                  className="flex items-center gap-1 hover:text-text-primary transition-colors text-[11px]"
                >
                  {copiedField === 'Anchor Text' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {backlink.anchorText ? (
                `"${backlink.anchorText}"`
              ) : (
                <span className="text-text-muted italic">No anchor text detected (e.g. image link or bare URL)</span>
              )}
            </p>
          </div>

          {/* Section 3: Metric Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Domain Authority */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] text-text-muted">Source DA</span>
              <p className="text-lg font-mono font-bold text-text-primary mt-1">
                {backlink.sourceDomainAuthority ?? 'N/A'}
              </p>
            </div>

            {/* Page Authority */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] text-text-muted">Source PA</span>
              <p className="text-lg font-mono font-bold text-text-primary mt-1">
                {backlink.sourcePageAuthority ?? 'N/A'}
              </p>
            </div>

            {/* Link Equity */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] text-text-muted">Link Equity</span>
              <p className="text-xs font-mono font-bold text-emerald-400 mt-2 uppercase">
                {backlink.linkType || 'unknown'}
              </p>
            </div>

            {/* Provider */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] text-text-muted">SEO Provider</span>
              <p className="text-xs font-mono font-bold text-text-primary mt-2 uppercase">
                {backlink.provider || 'moz'}
              </p>
            </div>
          </div>

          {/* Section 4: Timestamps & Discovery */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2 text-xs">
            <h4 className="font-semibold text-text-primary text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              Historical Discovery Timestamps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-text-muted">
              <div>
                <span className="text-[10px] block">First Seen:</span>
                <span className="font-mono text-text-primary">
                  {backlink.firstSeen ? new Date(backlink.firstSeen).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] block">Last Seen:</span>
                <span className="font-mono text-text-primary">
                  {backlink.lastSeen ? new Date(backlink.lastSeen).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] block">Last Fetched:</span>
                <span className="font-mono text-text-primary">
                  {backlink.fetchedAt ? new Date(backlink.fetchedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Meta info if present */}
          {backlink.meta && Object.keys(backlink.meta).length > 0 && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Provider Metadata
              </span>
              <div className="space-y-1 font-mono text-[11px] text-text-secondary">
                {backlink.meta.sourceTitle && (
                  <p>
                    <span className="text-text-muted">Page Title:</span> {backlink.meta.sourceTitle}
                  </p>
                )}
                {typeof backlink.meta.flagRedirect !== 'undefined' && (
                  <p>
                    <span className="text-text-muted">Redirected Link:</span>{' '}
                    {backlink.meta.flagRedirect ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-[#101318] flex items-center justify-between">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Saved in Linkora MongoDB Database
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
