import React, { useState } from 'react';
import { X, Globe, Link2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useWebsite } from '../../context/WebsiteContext';

export const AddWebsiteModal = ({ isOpen, onClose, onWebsiteAdded }) => {
  const { addWebsite } = useWebsite();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Website name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (!url.trim()) {
      errs.url = 'Domain or URL is required';
    } else {
      // Basic domain check
      const clean = url.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      if (!clean.includes('.') || clean.length < 4) {
        errs.url = 'Please enter a valid domain (e.g. example.com or https://example.com)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    const res = await addWebsite({
      name: name.trim(),
      url: url.trim(),
      description: description.trim()
    });
    setSubmitting(false);

    if (res.success) {
      setName('');
      setUrl('');
      setDescription('');
      onClose();
      if (onWebsiteAdded && res.data) {
        onWebsiteAdded(res.data);
      }
    } else {
      setServerError(res.message || 'Failed to add website.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="surface-card w-full max-w-lg rounded-2xl border border-white/[0.08] shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Add New Website</h2>
              <p className="text-[11px] text-text-muted">Register a domain for backlink tracking and SEO analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Website Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Website Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g. GrowthLabs Platform"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D10] border ${
                errors.name ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/[0.08] focus:border-emerald-500/50'
              } text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-rose-400">{errors.name}</p>}
          </div>

          {/* Domain / URL */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Domain or URL <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) setErrors({ ...errors, url: '' });
                }}
                placeholder="e.g. https://growthlabs.io or growthlabs.io"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B0D10] border ${
                  errors.url ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/[0.08] focus:border-emerald-500/50'
                } text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors font-mono`}
              />
            </div>
            {errors.url && <p className="mt-1 text-[11px] text-rose-400">{errors.url}</p>}
            <p className="mt-1 text-[11px] text-text-muted">
              Domains are automatically normalized. e.g. <code className="text-emerald-400">https://www.example.com</code> becomes <code className="text-emerald-400">example.com</code>.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Description <span className="text-text-muted">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary marketing website, production store, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D10] border border-white/[0.08] focus:border-emerald-500/50 text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Website...</span>
                </>
              ) : (
                <span>Add Website</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
