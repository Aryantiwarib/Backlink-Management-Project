import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useWebsite } from '../../context/WebsiteContext';

export const DeleteWebsiteModal = ({ isOpen, website, onClose }) => {
  const { deleteWebsite } = useWebsite();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !website) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    const res = await deleteWebsite(website.id || website._id);
    setSubmitting(false);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="surface-card w-full max-w-md rounded-2xl border border-white/[0.08] shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Delete Website</h2>
              <p className="text-[11px] text-text-muted">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Are you sure you want to delete this website?</span>
            </div>
            <p className="text-[11px] text-rose-300/80 pl-6 leading-relaxed">
              All tracked backlinks, campaigns, and verification records associated with{' '}
              <strong className="text-white font-mono">{website.domain}</strong> will be permanently removed.
            </p>
          </div>

          <p className="text-text-secondary leading-relaxed">
            Website: <span className="text-text-primary font-semibold">{website.name}</span> (<code className="text-emerald-400">{website.domain}</code>)
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0E1115]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Website</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
