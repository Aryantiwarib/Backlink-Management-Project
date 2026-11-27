import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building,
  User,
  Mail,
  Copy,
  Check,
  Edit3,
  Sliders,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { bulkEmailApi } from '../../api/bulkEmailService';

const PURPOSES = [
  'Backlink Request',
  'Guest Post',
  'Link Insertion',
  'Collaboration',
  'Partnership',
  'Follow-up',
  'Custom'
];

const TONES = [
  'Professional',
  'Friendly',
  'Formal',
  'Persuasive',
  'Casual',
  'Natural and Human',
  'Confident'
];

const LENGTHS = ['Short', 'Medium', 'Detailed'];

const PLACEHOLDERS = [
  { token: '{{recipient_name}}', label: 'Recipient Name' },
  { token: '{{company_name}}', label: 'Company Name' },
  { token: '{{website_domain}}', label: 'Website Domain' },
  { token: '{{sender_name}}', label: 'Your Name' },
  { token: '{{your_website}}', label: 'Your Website' }
];

export const GenerateMailModal = ({
  isOpen,
  onClose,
  selectedProspects = [],
  websiteId = null,
  campaignId = null,
  campaignName = '',
  defaultSenderName = '',
  onEmailsSent = null
}) => {
  // Normalize prospects to uniform format
  const normalizedProspects = React.useMemo(() => {
    return selectedProspects.map((item) => {
      const p = item.prospect || item;
      const domain = (p.prospectDomain || item.prospectDomain || item.domain || '').trim().toLowerCase();

      let contactName = (p.contactName || item.contactName || '').trim();
      let contactEmail = (p.contactEmail || item.contactEmail || '').trim().toLowerCase();

      if (p.contactEmails && p.contactEmails.length > 0) {
        const first = p.contactEmails.find((c) => c && c.email) || p.contactEmails[0];
        if (first) {
          if (!contactEmail && first.email) contactEmail = first.email.trim().toLowerCase();
          if (!contactName && first.name) contactName = first.name.trim();
        }
      }

      let companyName = (p.companyName || item.companyName || '').trim();
      if (!companyName && domain) {
        const head = domain.split('.')[0];
        companyName = head.charAt(0).toUpperCase() + head.slice(1);
      }

      return {
        id: String(p._id || p.id || item._id || item.id || ''),
        prospectId: String(p._id || p.id || item._id || item.id || ''),
        assignmentId: item.prospect ? String(item._id || item.id) : (item.assignmentId || null),
        domain,
        companyName: companyName || 'Company',
        contactName,
        contactEmail,
        websiteUrl: p.prospectUrl || item.prospectUrl || `https://${domain}`
      };
    });
  }, [selectedProspects]);

  // Generation options
  const [purpose, setPurpose] = useState('Backlink Request');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [senderName, setSenderName] = useState(defaultSenderName || '');

  // Common template state
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [templateHistory, setTemplateHistory] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');

  // Active view tab: 'template' | 'preview'
  const [activeTab, setActiveTab] = useState('template');

  // Preview state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [editableEmails, setEditableEmails] = useState({});
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Sending state
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null); // { sentCount, failedCount, total, results }
  const [retryingId, setRetryingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const bodyInputRef = useRef(null);

  // Push to undo history stack
  const pushHistory = (subj, bdy) => {
    setTemplateHistory((prev) => [...prev.slice(-9), { subject: subj, body: bdy }]);
  };

  const handleUndo = () => {
    if (templateHistory.length === 0) return;
    const last = templateHistory[templateHistory.length - 1];
    setTemplateHistory((prev) => prev.slice(0, -1));
    setSubjectTemplate(last.subject);
    setBodyTemplate(last.body);
  };

  // Generate common template on initial open or on button click
  const handleGenerateTemplate = async () => {
    setGenerating(true);
    setErrorMessage('');
    try {
      const res = await bulkEmailApi.generateTemplate({
        purpose,
        tone,
        length,
        customInstructions,
        websiteId,
        campaignId,
        senderName
      });

      if (subjectTemplate || bodyTemplate) {
        pushHistory(subjectTemplate, bodyTemplate);
      }

      setSubjectTemplate(res.template.subject);
      setBodyTemplate(res.template.body);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate common email template');
    } finally {
      setGenerating(false);
    }
  };

  // Automatically generate once if templates are empty upon open
  useEffect(() => {
    if (isOpen && !subjectTemplate && !bodyTemplate && !generating) {
      handleGenerateTemplate();
    }
  }, [isOpen]);

  // Handle 1-click Quick Action modifications
  const handleQuickAction = async (action, overrideTone = '') => {
    if (!subjectTemplate || !bodyTemplate) return;
    setModifying(true);
    setErrorMessage('');
    try {
      pushHistory(subjectTemplate, bodyTemplate);

      const res = await bulkEmailApi.modifyTemplate({
        subject: subjectTemplate,
        body: bodyTemplate,
        action,
        tone: overrideTone || tone,
        customInstructions: action === 'Custom Instructions' ? customPromptText : '',
        websiteId,
        senderName
      });

      setSubjectTemplate(res.template.subject);
      setBodyTemplate(res.template.body);

      if (action === 'Custom Instructions') {
        setCustomPromptOpen(false);
        setCustomPromptText('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to modify template');
    } finally {
      setModifying(false);
    }
  };

  // Insert dynamic placeholder into body at cursor
  const insertPlaceholder = (token) => {
    if (!bodyInputRef.current) {
      setBodyTemplate((prev) => `${prev} ${token}`);
      return;
    }
    const start = bodyInputRef.current.selectionStart || 0;
    const end = bodyInputRef.current.selectionEnd || 0;
    const current = bodyTemplate;
    const updated = current.substring(0, start) + token + current.substring(end);
    setBodyTemplate(updated);

    setTimeout(() => {
      if (bodyInputRef.current) {
        bodyInputRef.current.focus();
        bodyInputRef.current.setSelectionRange(start + token.length, start + token.length);
      }
    }, 50);
  };

  // Personalized preview for active prospect index
  const currentProspect = normalizedProspects[previewIndex] || normalizedProspects[0] || {};
  const currentEffectiveEmail = editableEmails[currentProspect.id] !== undefined
    ? editableEmails[currentProspect.id]
    : currentProspect.contactEmail;

  const renderPersonalized = (prospectItem) => {
    if (!subjectTemplate && !bodyTemplate) return { subject: '', body: '' };

    const p = prospectItem || {};
    const domain = p.domain || 'website.com';
    const company = p.companyName || 'Company';
    const name = p.contactName || '';

    let renderedSubject = subjectTemplate;
    let renderedBody = bodyTemplate;

    // Greeting & Name resolution
    if (name) {
      renderedSubject = renderedSubject
        .replace(/\{\{\s*recipient_name\s*\}\}/gi, name)
        .replace(/\{\{\s*contactName\s*\}\}/gi, name);
      renderedBody = renderedBody
        .replace(/\{\{\s*recipient_name\s*\}\}/gi, name)
        .replace(/\{\{\s*contactName\s*\}\}/gi, name);
    } else {
      const teamGreeting = company && company !== 'Company' ? `${company} Team` : `${domain} Team`;
      renderedBody = renderedBody
        .replace(/Hi\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hi ${teamGreeting},`)
        .replace(/Hello\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hello ${teamGreeting},`)
        .replace(/Dear\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Dear ${teamGreeting},`)
        .replace(/Hey\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hey there,`)
        .replace(/\{\{\s*(?:recipient_name|contactName)\s*\}\}/gi, 'there');

      renderedSubject = renderedSubject.replace(/\{\{\s*(?:recipient_name|contactName)\s*\}\}/gi, company || domain);
    }

    renderedSubject = renderedSubject
      .replace(/\{\{\s*company_name\s*\}\}/gi, company)
      .replace(/\{\{\s*companyName\s*\}\}/gi, company)
      .replace(/\{\{\s*website_domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*prospectDomain\s*\}\}/gi, domain)
      .replace(/\{\{\s*sender_name\s*\}\}/gi, senderName || 'The Team')
      .replace(/\{\{\s*senderName\s*\}\}/gi, senderName || 'The Team')
      .replace(/\{\{\s*your_website\s*\}\}/gi, 'our website')
      .replace(/\{\{\s*websiteName\s*\}\}/gi, 'our website');

    renderedBody = renderedBody
      .replace(/\{\{\s*company_name\s*\}\}/gi, company)
      .replace(/\{\{\s*companyName\s*\}\}/gi, company)
      .replace(/\{\{\s*website_domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*prospectDomain\s*\}\}/gi, domain)
      .replace(/\{\{\s*sender_name\s*\}\}/gi, senderName || 'The Team')
      .replace(/\{\{\s*senderName\s*\}\}/gi, senderName || 'The Team')
      .replace(/\{\{\s*your_website\s*\}\}/gi, 'our website')
      .replace(/\{\{\s*websiteName\s*\}\}/gi, 'our website');

    if (campaignName) {
      renderedSubject = renderedSubject.replace(/\{\{\s*campaignName\s*\}\}/gi, campaignName);
      renderedBody = renderedBody.replace(/\{\{\s*campaignName\s*\}\}/gi, campaignName);
    }

    return {
      subject: renderedSubject.trim(),
      body: renderedBody.trim()
    };
  };

  const currentPersonalized = renderPersonalized(currentProspect);

  // Copy rendered preview to clipboard
  const handleCopyPreview = () => {
    const full = `Subject: ${currentPersonalized.subject}\n\n${currentPersonalized.body}`;
    navigator.clipboard.writeText(full);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  // Bulk send action
  const handleConfirmSend = async () => {
    setConfirmSendOpen(false);
    setSending(true);
    setErrorMessage('');

    try {
      // Build effective prospects list with any inline edited recipient emails
      const payloadProspects = normalizedProspects.map((p) => ({
        ...p,
        contactEmail: editableEmails[p.id] !== undefined ? editableEmails[p.id] : p.contactEmail
      }));

      const res = await bulkEmailApi.sendBulk({
        subjectTemplate,
        bodyTemplate,
        prospects: payloadProspects,
        websiteId,
        campaignId,
        senderName
      });

      setSendProgress(res);
      if (onEmailsSent) onEmailsSent(res);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch bulk outreach emails');
    } finally {
      setSending(false);
    }
  };

  // Individual retry action for a failed dispatch
  const handleRetrySingle = async (resultItem) => {
    setRetryingId(resultItem.prospectId);
    try {
      const prospect = normalizedProspects.find((p) => p.prospectId === resultItem.prospectId) || {};
      const personalized = renderPersonalized(prospect);
      const email = editableEmails[resultItem.prospectId] || resultItem.recipientEmail;

      const res = await bulkEmailApi.retrySingle({
        emailId: resultItem.emailId,
        prospect,
        subject: personalized.subject,
        body: personalized.body,
        recipientEmail: email,
        websiteId,
        campaignId,
        senderName
      });

      if (res.success) {
        setSendProgress((prev) => {
          if (!prev) return prev;
          const updatedResults = prev.results.map((r) =>
            r.prospectId === resultItem.prospectId
              ? { ...r, status: 'sent', error: null, messageId: res.messageId }
              : r
          );
          return {
            ...prev,
            sentCount: prev.sentCount + 1,
            failedCount: Math.max(0, prev.failedCount - 1),
            results: updatedResults
          };
        });
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl my-auto rounded-2xl bg-[#15191E] border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#101419] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Generate Outreach Mail
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  {normalizedProspects.length} Selected
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Generate ONE common template with placeholders and personalize automatically for every recipient.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-200 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'template'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Common Template</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'preview'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview & Send ({normalizedProspects.length})</span>
            </button>
          </div>

          {/* Quick Undo & Status Indicator */}
          <div className="flex items-center gap-2">
            {templateHistory.length > 0 && activeTab === 'template' && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary text-[11px] transition-colors"
                title="Undo last template edit"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activeTab === 'template') setActiveTab('preview');
                else setConfirmSendOpen(true);
              }}
              disabled={generating || modifying || sending || !subjectTemplate || !bodyTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {activeTab === 'template' ? (
                <>
                  <span>Review & Send</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to All ({normalizedProspects.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* TAB 1: COMMON TEMPLATE GENERATOR & EDITOR */}
          {activeTab === 'template' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: Generation Settings */}
              <div className="lg:col-span-4 space-y-4 rounded-xl bg-[#0D1117] border border-white/[0.06] p-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Configuration</span>
                  </h4>
                  <span className="text-[10px] text-text-muted font-mono">1 Template</span>
                </div>

                {/* Email Purpose */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Email Purpose
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-[#15191E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-[#15191E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Length */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Length
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LENGTHS.map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setLength(len)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                          length === len
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                            : 'bg-white/[0.02] text-text-muted hover:text-white border border-white/[0.04]'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Instructions */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Keep the email professional and mention their latest blog post..."
                    className="w-full bg-[#15191E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                  />
                </div>

                {/* Sender Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Alex from Linkora"
                    className="w-full bg-[#15191E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Generate / Regenerate Button */}
                <button
                  type="button"
                  onClick={handleGenerateTemplate}
                  disabled={generating || modifying}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Generating Template...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Template</span>
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT COLUMN: Common Template Editor & Quick 1-Click Modification */}
              <div className="lg:col-span-8 space-y-4">
                {/* Quick 1-Click Actions Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Quick Modification Actions
                    </span>
                    {modifying && (
                      <span className="text-[11px] text-emerald-400 animate-pulse flex items-center gap-1 font-mono">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Updating...
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      'Make Shorter',
                      'Make Longer',
                      'More Professional',
                      'More Persuasive',
                      'More Natural',
                      'Improve Subject Line',
                      'Improve Opening Line',
                      'Improve Call to Action'
                    ].map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => handleQuickAction(act)}
                        disabled={generating || modifying || !bodyTemplate}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-emerald-500/10 text-text-muted hover:text-emerald-300 border border-white/[0.06] hover:border-emerald-500/30 text-[11px] font-medium transition-all disabled:opacity-40"
                      >
                        {act}
                      </button>
                    ))}

                    {/* Change Tone Quick Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleQuickAction('Change Tone', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      disabled={generating || modifying || !bodyTemplate}
                      className="bg-[#0D1117] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Change Tone...
                      </option>
                      {TONES.map((t) => (
                        <option key={t} value={t}>
                          Tone: {t}
                        </option>
                      ))}
                    </select>

                    {/* Custom Instructions Prompt Button */}
                    <button
                      type="button"
                      onClick={() => setCustomPromptOpen(!customPromptOpen)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      Custom Instructions...
                    </button>
                  </div>

                  {/* Inline custom instruction prompt */}
                  {customPromptOpen && (
                    <div className="p-3 rounded-xl bg-[#0D1117] border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        value={customPromptText}
                        onChange={(e) => setCustomPromptText(e.target.value)}
                        placeholder="e.g. Add a sentence complimenting their SEO case study..."
                        className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customPromptText.trim()) {
                            handleQuickAction('Custom Instructions');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAction('Custom Instructions')}
                        disabled={!customPromptText.trim() || modifying}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomPromptOpen(false)}
                        className="p-1 text-text-muted hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Common Subject Line Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-text-secondary">
                      Common Subject Line
                    </label>
                    <span className="text-[10px] text-text-muted">Dynamic placeholders supported</span>
                  </div>
                  <input
                    type="text"
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="e.g. Content partnership idea for {{website_domain}}"
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-medium text-text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Dynamic Placeholders Pills Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mr-1">
                    Insert:
                  </span>
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.token}
                      type="button"
                      onClick={() => insertPlaceholder(ph.token)}
                      className="px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono transition-colors"
                      title={`Click to insert ${ph.token}`}
                    >
                      {ph.token}
                    </button>
                  ))}
                </div>

                {/* Common Body Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-text-secondary">
                      Common Email Body
                    </label>
                    <span className="text-[10px] text-text-muted">
                      Edits propagate automatically across all {normalizedProspects.length} recipients
                    </span>
                  </div>
                  <textarea
                    ref={bodyInputRef}
                    rows={12}
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    placeholder="Hi {{recipient_name}},&#10;&#10;I was reading through {{company_name}} on {{website_domain}}..."
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-xl p-3.5 text-xs font-mono text-text-primary leading-relaxed placeholder:text-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW BEFORE SENDING & BULK DISPATCH PROGRESS */}
          {activeTab === 'preview' && (
            <div className="space-y-5">
              {/* IF BULK SENDING COMPLETED / IN PROGRESS */}
              {sendProgress && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#0D1117] border border-white/[0.08] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Bulk Outreach Dispatch Summary
                        </h4>
                        <p className="text-[11px] text-text-muted">
                          Emails are delivered as individual 1-to-1 messages via your connected Gmail.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-text-muted">
                        Total: <strong>{sendProgress.total}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        Sent: {sendProgress.sentCount}
                      </span>
                      {sendProgress.failedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                          Failed: {sendProgress.failedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Results list */}
                  <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto">
                    {sendProgress.results.map((r, idx) => (
                      <div
                        key={idx}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {r.status === 'sent' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-semibold text-text-primary mr-2">
                              {r.domain || r.recipientName}
                            </span>
                            <span className="text-text-muted font-mono text-[11px]">
                              {r.recipientEmail}
                            </span>
                            {r.error && (
                              <p className="text-[11px] text-rose-400 truncate mt-0.5">
                                Error: {r.error}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          {r.status === 'sent' ? (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Delivered
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRetrySingle(r)}
                              disabled={retryingId === r.prospectId}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors disabled:opacity-50"
                            >
                              {retryingId === r.prospectId ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INDIVIDUAL RECIPIENT CAROUSEL PREVIEW */}
              <div className="rounded-xl bg-[#0D1117] border border-white/[0.08] overflow-hidden">
                {/* Carousel Navigation Header */}
                <div className="p-3.5 border-b border-white/[0.06] bg-[#101419] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={previewIndex <= 0}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-text-primary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-semibold text-text-primary">
                      Recipient {previewIndex + 1} of {normalizedProspects.length}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) =>
                          Math.min(normalizedProspects.length - 1, prev + 1)
                        )
                      }
                      disabled={previewIndex >= normalizedProspects.length - 1}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-text-primary transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Recipient details pill */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-text-primary">
                        {currentProspect.domain}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Building className="w-3.5 h-3.5 text-text-muted" />
                      <span>{currentProspect.companyName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-text-muted">
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      <span className={currentProspect.contactName ? 'text-text-primary' : 'italic'}>
                        {currentProspect.contactName || 'No Name (Neutral Fallback)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPreview}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary text-[11px] transition-colors"
                      title="Copy rendered email to clipboard"
                    >
                      {copiedPreview ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recipient Email Address Input Bar */}
                <div className="px-5 py-3 border-b border-white/[0.04] bg-[#0A0D12] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="text-text-muted shrink-0">Send to:</span>
                    <input
                      type="email"
                      value={currentEffectiveEmail}
                      onChange={(e) =>
                        setEditableEmails((prev) => ({
                          ...prev,
                          [currentProspect.id]: e.target.value
                        }))
                      }
                      placeholder="Enter recipient email (e.g. editor@domain.com)"
                      className="w-full bg-[#15191E] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {!currentEffectiveEmail && (
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Email address required for sending
                    </span>
                  )}
                </div>

                {/* Rendered Personalized Email Preview */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                      Rendered Subject:
                    </span>
                    <div className="p-3 rounded-xl bg-[#15191E] border border-white/[0.06] text-xs font-semibold text-text-primary">
                      {currentPersonalized.subject || '(Subject line will appear here)'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                      Rendered Body:
                    </span>
                    <div className="p-4 rounded-xl bg-[#15191E] border border-white/[0.06] text-xs font-mono text-text-primary leading-relaxed whitespace-pre-line min-h-[160px]">
                      {currentPersonalized.body || '(Email body will appear here)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#101419] shrink-0">
          <div className="text-xs text-text-muted">
            {activeTab === 'template' ? (
              <span>Template edits apply to all recipients automatically.</span>
            ) : (
              <span>
                Ready to send individual emails to <strong>{normalizedProspects.length}</strong> recipients.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'template' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={!subjectTemplate || !bodyTemplate || generating || modifying}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <span>Proceed to Preview & Send</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSendOpen(true)}
                disabled={sending || normalizedProspects.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all cursor-pointer"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Sending ({normalizedProspects.length})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to All ({normalizedProspects.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION POPUP MODAL */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#15191E] border border-white/[0.1] shadow-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Confirm Bulk Send</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                You are about to send <strong>{normalizedProspects.length}</strong> personalized emails. Continue?
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1117] border border-white/[0.06] text-left text-xs space-y-1.5 text-text-secondary">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>One separate individual email sent to each recipient</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Never CC'd or BCC'd together</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sent directly from your connected Gmail</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Yes, Send Emails
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default GenerateMailModal;
