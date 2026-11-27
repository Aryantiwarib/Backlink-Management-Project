import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  User,
  Globe
} from 'lucide-react';
import { SUPPORTED_PLACEHOLDERS } from './placeholderConstants';
import { outreachApi } from '../../api/outreachService';
import { AiEmailStudioModal } from './AiEmailStudioModal';

export const EmailComposerModal = ({
  isOpen,
  onClose,
  campaign,
  prospects = [], // Array of prospects or assignments
  templates = [],
  connectedAccount,
  onSend,
  onPreview,
  initialSubject = '',
  initialBody = ''
}) => {
  const [selectedProspectIds, setSelectedProspectIds] = useState(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [senderName, setSenderName] = useState('');
  const [aiStudioOpen, setAiStudioOpen] = useState(false);

  // Account state management (normalizes nested { connected, account } vs flat account object)
  const [accountStatusState, setAccountStatusState] = useState(connectedAccount || null);
  const [accountChecking, setAccountChecking] = useState(false);
  const [selectedEmailMap, setSelectedEmailMap] = useState({});

  // Mode: 'compose' vs 'preview'
  const [viewMode, setViewMode] = useState('compose');
  const [previews, setPreviews] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Schedule options
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Normalize connected account details
  const account = accountStatusState?.account || accountStatusState;
  const isConnected = Boolean(
    (accountStatusState?.connected && account?.status === 'connected') ||
    accountStatusState?.status === 'connected' ||
    account?.status === 'connected'
  );
  const accountEmail = account?.email || accountStatusState?.email || '';

  // Initialize selections and check account status when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setViewMode('compose');
      setPreviews([]);
      setPreviewIdx(0);
      if (initialSubject) setSubject(initialSubject);
      if (initialBody) setBody(initialBody);

      // Select all prospects that have a valid email by default
      const validIds = prospects
        .filter((p) => {
          const email = p.contactEmail || p.prospect?.contactEmail;
          return email && email.includes('@');
        })
        .map((p) => p.prospectId?._id || p.prospectId || p.prospect?.id || p._id || p.id);

      setSelectedProspectIds(new Set(validIds.map(String)));

      // Initialize sender name
      if (account?.metadata?.name || account?.name) {
        setSenderName(account?.metadata?.name || account?.name);
      }

      // If connectedAccount prop is provided, sync state
      if (connectedAccount) {
        setAccountStatusState(connectedAccount);
      } else {
        // If not provided or null, fetch account status from API directly
        setAccountChecking(true);
        outreachApi
          .getAccountStatus()
          .then((status) => {
            setAccountStatusState(status);
            if (status?.account?.metadata?.name) {
              setSenderName((prev) => prev || status.account.metadata.name);
            }
          })
          .catch((err) => {
            console.warn('[EmailComposer] Failed to fetch account status:', err.message);
          })
          .finally(() => {
            setAccountChecking(false);
          });
      }
    }
  }, [isOpen, prospects, connectedAccount]);

  if (!isOpen) return null;

  // Toggle prospect selection
  const toggleProspect = (id) => {
    setSelectedProspectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Template chosen
  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen) {
      setSubject(chosen.subject);
      setBody(chosen.body);
    }
  };

  const insertPlaceholder = (ph) => {
    setBody((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + ph + ' ');
  };

  // Preview generation
  const handleTogglePreview = async () => {
    if (viewMode === 'compose') {
      if (!subject.trim() || !body.trim()) {
        setError('Please enter a subject and body before previewing.');
        return;
      }
      const ids = Array.from(selectedProspectIds);
      if (ids.length === 0) {
        setError('Please select at least one prospect to preview.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const previewList = await onPreview({
          prospectIds: ids,
          subject,
          body,
          templateId: selectedTemplateId || null,
          senderName
        });
        setPreviews(previewList || []);
        setPreviewIdx(0);
        setViewMode('preview');
      } catch (err) {
        setError(err?.message || 'Failed to generate preview.');
      } finally {
        setLoading(false);
      }
    } else {
      setViewMode('compose');
    }
  };

  // Dispatch / Queue sending
  const handleConfirmSend = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your Gmail account in Email Settings first.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('Subject and email body are required.');
      return;
    }

    const ids = Array.from(selectedProspectIds);
    if (ids.length === 0) {
      setError('Please select at least one recipient prospect with a valid email.');
      return;
    }

    const prospectSelections = [];
    for (const p of prospects) {
      const pId = String(p.prospectId?._id || p.prospectId || p.prospect?.id || p._id || p.id);
      if (selectedProspectIds.has(pId)) {
        const chosenEmail = selectedEmailMap[pId] || p.contactEmail || p.prospect?.contactEmail;
        const name = p.contactName || p.prospect?.contactName || '';
        const assignmentId = p.assignmentId || p._id;
        if (chosenEmail && chosenEmail.includes('@')) {
          prospectSelections.push({
            prospectId: pId,
            assignmentId,
            recipientEmail: chosenEmail,
            recipientName: name
          });
        }
      }
    }

    if (prospectSelections.length === 0) {
      setError('None of the selected prospects have a valid contact email.');
      return;
    }

    const confirmMsg = isScheduled
      ? `Schedule ${prospectSelections.length} outreach emails for ${scheduledDate}?`
      : `Queue and send ${prospectSelections.length} personalized outreach emails via ${accountEmail}?`;

    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setError('');
    try {
      await onSend({
        templateId: selectedTemplateId || null,
        subjectTemplate: subject.trim(),
        bodyTemplate: body.trim(),
        prospectSelections,
        senderName: senderName.trim(),
        scheduledFor: isScheduled && scheduledDate ? new Date(scheduledDate) : null
      });

      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to send outreach emails.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Compose Outreach Email — {campaign?.name}
              </h3>
              <p className="text-xs text-text-muted">
                {accountChecking ? (
                  <span className="text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> Checking Gmail connection...
                  </span>
                ) : isConnected ? (
                  <span className="text-emerald-400 font-medium">
                    Sending from <strong className="text-text-primary font-bold">{accountEmail}</strong> (Connected via Google OAuth)
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    Gmail account not connected. Please connect in Email Settings.
                  </span>
                )}
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

        {/* Error notification banner */}
        {error && (
          <div className="p-3 mx-6 mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Recipient Prospects */}
          <div className="w-full md:w-72 border-r border-white/[0.08] p-4 flex flex-col gap-3 overflow-y-auto bg-[#101419]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                Recipients ({selectedProspectIds.size}/{prospects.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {prospects.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">
                  No prospects assigned to this campaign yet.
                </p>
              ) : (
                prospects.map((p) => {
                  const pId = String(p.prospectId?._id || p.prospectId || p.prospect?.id || p._id || p.id);
                  const domain = p.prospectDomain || p.prospect?.prospectDomain || 'Unknown';
                  const allEmails = p.contactEmails || p.prospect?.contactEmails || [];
                  const defaultEmail = p.contactEmail || p.prospect?.contactEmail || (allEmails[0]?.email || '');
                  const currentSelectedEmail = selectedEmailMap[pId] || defaultEmail;
                  const hasEmail = Boolean(currentSelectedEmail && currentSelectedEmail.includes('@'));
                  const isChecked = selectedProspectIds.has(pId);

                  return (
                    <div
                      key={pId}
                      className={`p-2 rounded-xl border transition-all ${
                        !hasEmail
                          ? 'opacity-40 bg-white/[0.01] border-white/[0.04]'
                          : isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-[#15191E] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!hasEmail}
                          onChange={() => toggleProspect(pId)}
                          className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 mt-0.5 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="overflow-hidden flex-1">
                          <span className="text-xs font-semibold text-text-primary block truncate">
                            {domain}
                          </span>
                          {allEmails.length > 1 ? (
                            <select
                              value={currentSelectedEmail}
                              onChange={(e) => {
                                const newMail = e.target.value;
                                setSelectedEmailMap((prev) => ({ ...prev, [pId]: newMail }));
                              }}
                              className="mt-1 w-full bg-black/60 border border-white/[0.1] rounded px-1.5 py-0.5 text-[10px] text-emerald-300 focus:outline-none"
                            >
                              {allEmails.map((em, idx) => (
                                <option key={idx} value={em.email} className="bg-[#15191E] text-text-primary">
                                  {em.email} {em.role ? `(${em.role})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] text-text-muted block truncate">
                              {hasEmail ? currentSelectedEmail : 'No contact email'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Compose or Preview */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#15191E] flex flex-col justify-between">
            {viewMode === 'compose' ? (
              <form onSubmit={handleConfirmSend} className="space-y-4">
                {/* AI Draft Quick Launcher & Content Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-xs font-bold text-text-secondary">Email Content</span>
                  <button
                    type="button"
                    onClick={() => setAiStudioOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-glow-brand transition-all"
                    title="Generate or refine cold outreach email with AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Draft with AI Studio</span>
                  </button>
                </div>

                {/* Template selector & Sender Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">
                      Choose Saved Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Custom Email / No Template --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id} className="bg-[#15191E]">
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Alex at Linkora"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Subject Line <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Quick question regarding {{prospectDomain}}"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Placeholders helper */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-text-muted">
                      Insert Personalization Tokens:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => insertPlaceholder(ph)}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-emerald-300 transition-colors"
                      >
                        + {ph}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Email Body (HTML / Plain text) <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={`Hi {{contactName}},\n\nI noticed your recent article on {{prospectDomain}} and thought it was fantastic. I'd love to collaborate on a resource piece for {{websiteName}}.\n\nBest regards,\n{{senderName}}`}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Scheduling Option */}
                <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-text-secondary">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Schedule send for later</span>
                  </label>

                  {isScheduled && (
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </form>
            ) : (
              /* Preview Mode */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-text-primary">
                      Personalized Preview ({previewIdx + 1} of {previews.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={previewIdx <= 0}
                      onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] disabled:opacity-40 text-xs text-text-secondary"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={previewIdx >= previews.length - 1}
                      onClick={() => setPreviewIdx((i) => Math.min(previews.length - 1, i + 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] disabled:opacity-40 text-xs text-text-secondary"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3 text-xs">
                    <div className="space-y-1 border-b border-white/[0.06] pb-3">
                      <div>
                        <span className="text-text-muted">To: </span>
                        <strong className="text-text-primary">
                          {previews[previewIdx]?.recipientEmail}
                        </strong>
                      </div>
                      <div>
                        <span className="text-text-muted">Subject: </span>
                        <strong className="text-emerald-400">
                          {previews[previewIdx]?.subject}
                        </strong>
                      </div>
                    </div>

                    <div className="whitespace-pre-line text-text-secondary leading-relaxed pt-1">
                      {previews[previewIdx]?.body}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 mt-4">
              <button
                type="button"
                onClick={handleTogglePreview}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{viewMode === 'compose' ? 'Preview Personalized Email' : 'Back to Editor'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-text-secondary hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSend}
                  disabled={sending || !isConnected || selectedProspectIds.size === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {sending
                      ? 'Queuing...'
                      : isScheduled
                      ? `Schedule (${selectedProspectIds.size})`
                      : `Send (${selectedProspectIds.size}) via Gmail`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded AI Email Studio Modal */}
      {aiStudioOpen && (
        <AiEmailStudioModal
          isOpen={aiStudioOpen}
          onClose={() => setAiStudioOpen(false)}
          initialCampaign={campaign}
          campaigns={campaign ? [campaign] : []}
          onApplyDraft={({ subject: newSub, body: newBody }) => {
            setSubject(newSub);
            setBody(newBody);
            setAiStudioOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default EmailComposerModal;
