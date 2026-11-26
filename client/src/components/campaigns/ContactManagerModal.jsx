import React, { useState } from 'react';
import {
  X,
  Mail,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sparkles
} from 'lucide-react';

export const ContactManagerModal = ({
  isOpen,
  onClose,
  assignment,
  onUpdateContact
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !assignment) return null;

  const prospect = assignment.prospect || {};
  const emails = prospect.contactEmails || [];

  const handleAddEmail = async (e) => {
    e.preventDefault();
    setError('');

    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const assignmentId = assignment.id || assignment._id;
    setSaving(true);
    try {
      await onUpdateContact(assignmentId, {
        action: 'add',
        email: clean,
        name: newName.trim(),
        role: newRole.trim()
      });
      setNewEmail('');
      setNewName('');
      setNewRole('');
    } catch (err) {
      setError(err?.message || 'Failed to add contact email.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    if (!window.confirm(`Remove ${emailToRemove} from prospect contacts?`)) return;
    const assignmentId = assignment.id || assignment._id;
    setSaving(true);
    try {
      await onUpdateContact(assignmentId, {
        action: 'remove',
        email: emailToRemove
      });
    } catch (err) {
      setError(err?.message || 'Failed to remove contact email.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Contact Information: {prospect.prospectDomain || 'Prospect'}
              </h3>
              <p className="text-xs text-text-muted">
                Review discovered contact emails or add verified outreach contacts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Discovered Emails List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Discovered Emails ({emails.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Status: {prospect.contactStatus || 'not_searched'}
              </span>
            </div>

            {emails.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-text-muted text-xs">
                No contact emails discovered yet for this domain.
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((c, idx) => (
                  <div
                    key={c.email || idx}
                    className="p-3 rounded-xl bg-[#0D1117] border border-white/[0.06] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary text-xs">
                          {c.email}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Primary
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-white/[0.04] text-text-muted border border-white/[0.06]">
                          {c.discoveryMethod === 'website_crawl'
                            ? 'Web Crawl'
                            : c.discoveryMethod === 'search_fallback'
                            ? 'Search Fallback'
                            : 'Manual'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-medium border ${
                            c.verificationStatus === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : c.verificationStatus === 'extracted'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-white/[0.04] text-text-muted border-white/[0.06]'
                          }`}
                        >
                          {c.verificationStatus === 'verified'
                            ? 'Verified'
                            : c.verificationStatus === 'extracted'
                            ? 'Extracted'
                            : c.verificationStatus || 'Unverified'}
                        </span>
                      </div>

                      {(c.name || c.role) && (
                        <p className="text-[11px] text-text-secondary">
                          {c.name} {c.role ? `• ${c.role}` : ''}
                        </p>
                      )}

                      {c.sourceUrl && (
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-text-muted hover:text-emerald-400 inline-flex items-center gap-1 truncate max-w-sm"
                        >
                          <span className="truncate">Source: {c.sourceUrl}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(c.email)}
                      disabled={saving}
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                      title="Remove email"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Contact Email Form */}
          <form onSubmit={handleAddEmail} className="pt-4 border-t border-white/[0.08] space-y-3">
            <span className="text-[11px] font-semibold text-text-primary block">
              Add Verified Contact Email
            </span>

            <div>
              <label className="text-[10px] text-text-muted block mb-1">
                Email Address <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="editor@targetdomain.com"
                className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">
                  Contact Name (Optional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-muted block mb-1">
                  Role (Optional)
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Content Editor"
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{saving ? 'Adding...' : 'Add Contact Email'}</span>
            </button>
          </form>
        </div>

        <div className="p-4 border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-text-secondary transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactManagerModal;
