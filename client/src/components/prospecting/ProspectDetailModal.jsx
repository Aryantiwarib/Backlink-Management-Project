import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Globe,
  Award,
  Sparkles,
  ShieldCheck,
  Calendar,
  Mail,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export const ProspectDetailModal = ({
  prospect,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [status, setStatus] = useState('saved');
  const [notes, setNotes] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (prospect) {
      setStatus(prospect.status || 'saved');
      setNotes(prospect.notes || '');
      setContactEmail(prospect.contactEmail || '');
      setSavedSuccess(false);
    }
  }, [prospect]);

  if (!isOpen || !prospect) return null;

  const handleSave = async () => {
    if (!prospect.id) return;
    setSaving(true);
    try {
      await onUpdate(prospect.id, {
        status,
        notes,
        contactEmail
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove ${prospect.prospectDomain}?`)) return;
    if (onDelete && prospect.id) {
      await onDelete(prospect.id);
      onClose();
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 50) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>{prospect.prospectDomain}</span>
                <a
                  href={prospect.prospectUrl || `https://${prospect.prospectDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-emerald-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </h3>
              <p className="text-xs text-text-muted mt-0.5 truncate max-w-md">
                {prospect.prospectUrl}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {/* Opportunity Score & Factor Breakdown */}
          <div className="p-4 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-text-primary">Opportunity Score</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${getScoreColor(
                  prospect.opportunityScore
                )}`}
              >
                {prospect.opportunityScore !== null ? `${prospect.opportunityScore}/100` : 'Unassessed'}
              </span>
            </div>

            {prospect.opportunityFactors && prospect.opportunityFactors.length > 0 ? (
              <div className="divide-y divide-white/[0.04] pt-1">
                {prospect.opportunityFactors.map((f, i) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-text-primary">{f.factor}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{f.description}</div>
                    </div>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        f.points > 0
                          ? 'text-emerald-400'
                          : f.points < 0
                          ? 'text-rose-400'
                          : 'text-text-muted'
                      }`}
                    >
                      {f.points > 0 ? `+${f.points}` : f.points}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">No individual score factors available.</p>
            )}
          </div>

          {/* SEO Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-text-muted block">Domain Authority</span>
              <span className="text-lg font-bold text-text-primary font-mono mt-1 block">
                {prospect.domainAuthority !== null ? `DA ${prospect.domainAuthority}` : 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-text-muted block">Page Authority</span>
              <span className="text-lg font-bold text-text-primary font-mono mt-1 block">
                {prospect.pageAuthority !== null ? `PA ${prospect.pageAuthority}` : 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-text-muted block">Spam Score</span>
              <span className="text-lg font-bold text-text-primary font-mono mt-1 block">
                {prospect.spamScore !== null ? `${prospect.spamScore}%` : 'Low / Clean'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-text-muted block">Discovery Source</span>
              <span className="text-xs font-semibold text-emerald-400 uppercase mt-2 block truncate">
                {prospect.source}
              </span>
            </div>
          </div>

          {/* Discovery Metadata */}
          <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
            <div className="font-semibold text-text-primary">Discovery Signal & Origins:</div>
            {prospect.competitorDomains && prospect.competitorDomains.length > 0 && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <span>Linking to competitors:</span>
                <span className="text-text-primary font-medium">
                  {prospect.competitorDomains.join(', ')}
                </span>
              </div>
            )}
            {prospect.discoveryKeyword && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <span>Discovered via keyword:</span>
                <span className="text-text-primary font-medium">"{prospect.discoveryKeyword}"</span>
              </div>
            )}
            {prospect.createdAt && (
              <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                <Calendar className="w-3 h-3 text-text-muted" />
                <span>Saved on {new Date(prospect.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Status & Contact Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Pipeline Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0D1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="saved">Saved (New Prospect)</option>
                <option value="reviewed">Reviewed (Evaluating)</option>
                <option value="qualified">Qualified (Target for Outreach)</option>
                <option value="rejected">Rejected (Not a fit)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Contact Email (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="editor@prospect.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Notes field */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
              Prospect Notes & Strategy
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record editorial angles, outreach contacts, pitch notes, or why this domain is a high-value opportunity..."
              className="w-full p-3 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 placeholder:text-text-muted resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] flex items-center justify-between bg-[#101419]">
          {prospect.id ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Prospect</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetailModal;
