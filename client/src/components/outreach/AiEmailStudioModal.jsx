import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  Undo2,
  Save,
  Trash2,
  Wand2,
  SlidersHorizontal,
  User,
  Building,
  Mail,
  FileText,
  AlertCircle
} from 'lucide-react';
import { aiEmailApi } from '../../api/aiEmailService';
import { useToast } from '../../context/ToastContext';
import { useWebsite } from '../../context/WebsiteContext';

const EMAIL_PURPOSES = [
  'Backlink Request',
  'Guest Post Outreach',
  'Link Insertion Request',
  'Collaboration Request',
  'Partnership Proposal',
  'First Outreach',
  'Follow-up Email',
  'Custom Email'
];

const EMAIL_TONES = [
  'Professional',
  'Friendly',
  'Formal',
  'Casual',
  'Persuasive',
  'Confident',
  'Natural and Human',
  'Follow-up'
];

const EMAIL_LENGTHS = ['Short', 'Medium', 'Detailed'];

export const AiEmailStudioModal = ({
  isOpen,
  onClose,
  initialProspect = null,
  initialCampaign = null,
  initialRecipientWebsite = '',
  initialRecipientName = '',
  initialRecipientEmail = '',
  campaigns = [],
  onApplyDraft = null // callback when user approves draft to be used in composer/queue
}) => {
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();

  // Configuration State
  const [recipientName, setRecipientName] = useState('');
  const [recipientWebsite, setRecipientWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [emailPurpose, setEmailPurpose] = useState('Backlink Request');
  const [tone, setTone] = useState('Natural and Human');
  const [emailLength, setEmailLength] = useState('Medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [variationsCount, setVariationsCount] = useState(2);

  // Editor State
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [variations, setVariations] = useState([]);
  const [activeVariationIdx, setActiveVariationIdx] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Undo / Revision History Stack
  const [historyStack, setHistoryStack] = useState([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  // Modification Controls
  const [customModPrompt, setCustomModPrompt] = useState('');
  const [showCustomModInput, setShowCustomModInput] = useState(false);
  const [modTargetField, setModTargetField] = useState('both'); // 'subject', 'body', 'both'

  // Loading & Feedback States
  const [generating, setGenerating] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const bodyTextareaRef = useRef(null);

  // Populate data when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      const targetWebsite =
        initialRecipientWebsite ||
        initialProspect?.prospectDomain ||
        initialProspect?.prospectUrl ||
        '';

      setRecipientWebsite(targetWebsite);
      setRecipientName(
        initialRecipientName ||
        initialProspect?.contactEmails?.[0]?.name ||
        ''
      );
      setRecipientEmail(
        initialRecipientEmail ||
        initialProspect?.contactEmail ||
        initialProspect?.contactEmails?.[0]?.email ||
        ''
      );
      setCompanyName(initialProspect?.companyName || targetWebsite.replace(/\..*$/, ''));

      if (initialCampaign?._id || initialCampaign?.id) {
        setSelectedCampaignId(initialCampaign._id || initialCampaign.id);
        if (initialCampaign.campaignType === 'Guest Posting') {
          setEmailPurpose('Guest Post Outreach');
        } else if (initialCampaign.campaignType === 'Broken Link Building') {
          setEmailPurpose('Link Insertion Request');
        }
      } else if (campaigns.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(campaigns[0]._id || campaigns[0].id);
      }
    }
  }, [isOpen, initialProspect, initialCampaign, initialRecipientWebsite]);

  if (!isOpen) return null;

  // Push new state to undo history
  const pushToHistory = (newSubject, newBody, actionLabel = 'edit') => {
    const newEntry = { subject: newSubject, body: newBody, actionLabel, timestamp: new Date() };
    const truncatedHistory = historyStack.slice(0, historyPointer + 1);
    setHistoryStack([...truncatedHistory, newEntry]);
    setHistoryPointer(truncatedHistory.length);
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const prevIdx = historyPointer - 1;
      const prevState = historyStack[prevIdx];
      setSubject(prevState.subject);
      setBody(prevState.body);
      setHistoryPointer(prevIdx);
      addToast(`Restored: ${prevState.actionLabel}`, 'info');
    }
  };

  // Generate Email
  const handleGenerate = async (count = variationsCount) => {
    if (!recipientWebsite.trim() && !companyName.trim() && !initialProspect) {
      setError('Please provide at least a recipient website or company name.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const payload = {
        websiteId: activeWebsite?._id || activeWebsite?.id,
        prospectId: initialProspect?._id || initialProspect?.id || null,
        campaignId: selectedCampaignId || null,
        recipientName: recipientName.trim(),
        recipientWebsite: recipientWebsite.trim(),
        companyName: companyName.trim(),
        recipientEmail: recipientEmail.trim(),
        emailPurpose,
        tone,
        emailLength,
        customInstructions: customInstructions.trim(),
        variationsCount: count
      };

      const res = await aiEmailApi.generateEmail(payload);

      if (res.variations && res.variations.length > 0) {
        setVariations(res.variations);
        setActiveVariationIdx(0);
        const firstVar = res.variations[0];
        setSubject(firstVar.subject);
        setBody(firstVar.body);

        // Reset undo history for this generation batch
        setHistoryStack([
          { subject: firstVar.subject, body: firstVar.body, actionLabel: 'Initial Generation', timestamp: new Date() }
        ]);
        setHistoryPointer(0);

        addToast(
          res.variations.length > 1
            ? `Generated ${res.variations.length} outreach variations.`
            : 'Outreach email generated.',
          'success'
        );
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      setError(err?.message || 'Failed to generate outreach email. Please try again.');
      addToast(err?.message || 'Failed to generate email', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Switch between variations
  const handleSelectVariation = (idx) => {
    if (variations[idx]) {
      setActiveVariationIdx(idx);
      const chosen = variations[idx];
      setSubject(chosen.subject);
      setBody(chosen.body);
      pushToHistory(chosen.subject, chosen.body, `Switched to Variation ${idx + 1}`);
    }
  };

  // Modify active draft
  const handleModify = async (action, overrideParams = {}) => {
    if (!body && !subject) {
      setError('Generate or enter an email before requesting modifications.');
      return;
    }

    setModifying(true);
    setError('');

    try {
      // Check if user selected text in body
      let selectedText = '';
      if (action === 'rewrite_selected' && bodyTextareaRef.current) {
        const { selectionStart, selectionEnd } = bodyTextareaRef.current;
        if (selectionStart !== selectionEnd) {
          selectedText = body.substring(selectionStart, selectionEnd);
        }
      }

      const payload = {
        currentSubject: subject,
        currentBody: body,
        action,
        tone: overrideParams.tone || tone,
        customInstructions: overrideParams.customInstructions || customModPrompt || '',
        selectedText,
        targetField: overrideParams.targetField || modTargetField,
        websiteId: activeWebsite?._id || activeWebsite?.id,
        campaignId: selectedCampaignId || null,
        prospectId: initialProspect?._id || initialProspect?.id || null
      };

      const res = await aiEmailApi.modifyEmail(payload);

      if (res.subject !== undefined) setSubject(res.subject);
      if (res.body !== undefined) setBody(res.body);

      pushToHistory(
        res.subject !== undefined ? res.subject : subject,
        res.body !== undefined ? res.body : body,
        res.summaryOfChange || action.replace(/_/g, ' ')
      );

      setShowCustomModInput(false);
      setCustomModPrompt('');
      addToast(res.summaryOfChange || 'Applied modification', 'success');
    } catch (err) {
      console.error('AI Modification Error:', err);
      setError(err?.message || 'Failed to modify email.');
      addToast(err?.message || 'Modification failed', 'error');
    } finally {
      setModifying(false);
    }
  };

  // Save Draft to Database
  const handleSaveDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please provide a subject and body before saving draft.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        draftId: activeDraftId,
        websiteId: activeWebsite?._id || activeWebsite?.id,
        prospectId: initialProspect?._id || initialProspect?.id || null,
        campaignId: selectedCampaignId || null,
        recipientName: recipientName.trim(),
        recipientWebsite: recipientWebsite.trim(),
        companyName: companyName.trim(),
        recipientEmail: recipientEmail.trim(),
        emailPurpose,
        tone,
        emailLength,
        customInstructions: customInstructions.trim(),
        subject: subject.trim(),
        body: body.trim(),
        variations,
        actionTaken: 'manual_save'
      };

      const res = await aiEmailApi.saveDraft(payload);
      if (res.draft?.id) {
        setActiveDraftId(res.draft.id);
      }
      addToast('Draft saved to database.', 'success');
    } catch (err) {
      console.error('Save Draft Error:', err);
      setError(err?.message || 'Failed to save draft.');
      addToast(err?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Discard Draft
  const handleDiscardDraft = async () => {
    if (activeDraftId) {
      try {
        await aiEmailApi.deleteDraft(activeDraftId);
      } catch (_err) {
        // Silently continue
      }
    }
    setSubject('');
    setBody('');
    setVariations([]);
    setHistoryStack([]);
    setHistoryPointer(-1);
    setActiveDraftId(null);
    addToast('Draft discarded.', 'info');
  };

  // Copy Subject & Body
  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  // Use in Composer / Outreach Pipeline
  const handleUseInComposer = () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please generate or write an email first.');
      return;
    }

    if (onApplyDraft) {
      onApplyDraft({
        subject: subject.trim(),
        body: body.trim(),
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        prospect: initialProspect,
        campaignId: selectedCampaignId
      });
      addToast('Email loaded into outreach composer.', 'success');
      onClose();
    } else {
      // Fallback copy
      navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      addToast('Email subject and body copied to clipboard.', 'success');
      onClose();
    }
  };

  // Word and character stats
  const charCount = body.length;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const subjectCharCount = subject.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-[#15191E] border border-white/[0.1] rounded-3xl w-full max-w-6xl h-[92vh] max-h-[950px] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#101318] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-tight">
                  AI Outreach Email Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Personalized Pitch Generator
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Generate, refine, and humanize authentic outreach pitches grounded in real prospect context
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {historyPointer > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-text-secondary hover:text-text-primary transition-colors"
                title="Undo last change"
              >
                <Undo2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Undo</span>
                <span className="text-[10px] text-text-muted font-mono">({historyPointer})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
              title="Close Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* Studio Workspace: Split 2-Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          {/* LEFT COLUMN: Input Configuration (Scrollable) */}
          <div className="w-full lg:w-[420px] bg-[#101318]/70 p-5 overflow-y-auto space-y-5 custom-scrollbar shrink-0">
            {/* 1. Recipient & Target Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Target Recipient Information
                </span>
                {initialProspect && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Linked Prospect
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Recipient Email <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="sarah@targetdomain.com"
                    className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Target Website <span className="text-emerald-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientWebsite}
                    onChange={(e) => setRecipientWebsite(e.target.value)}
                    placeholder="e.g. techcrunch.com"
                    className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Company / Brand Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. TechCrunch"
                    className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Campaign Selection */}
            {campaigns.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  Associated Campaign
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none"
                >
                  <option value="">No Campaign (Direct Outreach)</option>
                  {campaigns.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} ({c.campaignType || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Email Purpose */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Email Purpose
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {EMAIL_PURPOSES.map((p) => {
                  const isSelected = emailPurpose === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEmailPurpose(p)}
                      className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-medium transition-all truncate border ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm font-semibold'
                          : 'bg-[#15191E] text-text-muted hover:text-text-primary border-white/[0.06] hover:bg-white/[0.03]'
                      }`}
                      title={p}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Tone Selection */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Tone of Voice
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {EMAIL_TONES.map((t) => {
                  const isSelected = tone === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-medium transition-all truncate border ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm font-semibold'
                          : 'bg-[#15191E] text-text-muted hover:text-text-primary border-white/[0.06] hover:bg-white/[0.03]'
                      }`}
                      title={t}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Email Length & Variations Count */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Length
                </label>
                <div className="flex bg-[#15191E] rounded-xl p-1 border border-white/[0.08]">
                  {EMAIL_LENGTHS.map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setEmailLength(len)}
                      className={`flex-1 py-1 text-xs rounded-lg font-medium transition-all ${
                        emailLength === len
                          ? 'bg-emerald-500 text-black shadow-glow-brand font-semibold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Variations
                </label>
                <div className="flex bg-[#15191E] rounded-xl p-1 border border-white/[0.08]">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setVariationsCount(num)}
                      className={`flex-1 py-1 text-xs rounded-lg font-mono font-medium transition-all ${
                        variationsCount === num
                          ? 'bg-emerald-500 text-black shadow-glow-brand font-bold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Custom Instructions */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Additional Instructions <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Keep it natural, mention we recently published updated 2026 data, and avoid sounding promotional."
                className="w-full bg-[#15191E] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={() => handleGenerate(variationsCount)}
              disabled={generating}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs shadow-glow-brand transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>
                {generating
                  ? 'Crafting High-Converting Outreach...'
                  : variations.length > 0
                  ? `Regenerate Pitch (${variationsCount}x)`
                  : `Generate AI Outreach (${variationsCount}x)`}
              </span>
            </button>
          </div>

          {/* RIGHT COLUMN: Interactive Studio Editor */}
          <div className="flex-1 flex flex-col bg-[#15191E] overflow-hidden">
            {/* Top Toolbar: Variations Tabs & Stats */}
            <div className="px-5 py-3 border-b border-white/[0.08] bg-[#101318]/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Variations Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted font-semibold mr-1">Drafts:</span>
                {variations.length > 0 ? (
                  variations.map((v, idx) => (
                    <button
                      key={v.variationId || idx}
                      onClick={() => handleSelectVariation(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        activeVariationIdx === idx
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                          : 'bg-[#15191E] text-text-muted hover:text-text-primary border border-white/[0.06]'
                      }`}
                    >
                      Variation {idx + 1}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-text-muted italic">Ready to generate</span>
                )}
              </div>

              {/* Character & Word Counts */}
              <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                <span>Subject: <strong className="text-text-primary">{subjectCharCount}</strong> chars</span>
                <span>Body: <strong className="text-text-primary">{wordCount}</strong> words (<strong className="text-text-primary">{charCount}</strong> chars)</span>
              </div>
            </div>

            {/* Quick Modification Toolbar */}
            <div className="px-5 py-2.5 border-b border-white/[0.06] bg-[#15191E] flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 custom-scrollbar">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                Refine:
              </span>

              <button
                onClick={() => handleModify('make_shorter')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                Make Shorter
              </button>

              <button
                onClick={() => handleModify('make_longer')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                Make Longer
              </button>

              <button
                onClick={() => handleModify('make_more_persuasive')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                More Persuasive
              </button>

              <button
                onClick={() => handleModify('make_more_natural')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                More Natural & Human
              </button>

              <button
                onClick={() => handleModify('improve_opening')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                Improve Opening
              </button>

              <button
                onClick={() => handleModify('improve_cta')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                Improve CTA
              </button>

              <button
                onClick={() => handleModify('rewrite_email')}
                disabled={modifying || !body}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40"
              >
                Fresh Rewrite
              </button>

              <button
                onClick={() => setShowCustomModInput(!showCustomModInput)}
                disabled={modifying || !body}
                className={`px-2.5 py-1 rounded-lg border text-text-secondary whitespace-nowrap transition-colors disabled:opacity-40 ${
                  showCustomModInput
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-400 border-white/[0.06]'
                }`}
              >
                Custom Request...
              </button>
            </div>

            {/* Custom Modification Input Popdown */}
            {showCustomModInput && (
              <div className="p-3 bg-[#101318] border-b border-white/[0.08] flex flex-wrap items-center gap-2">
                <div className="flex bg-[#15191E] rounded-lg p-0.5 border border-white/[0.08] text-[10px]">
                  {['both', 'subject', 'body'].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setModTargetField(target)}
                      className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                        modTargetField === target
                          ? 'bg-emerald-500 text-black font-semibold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customModPrompt}
                  onChange={(e) => setCustomModPrompt(e.target.value)}
                  placeholder="e.g. Add a polite P.S. offering to share our data graphic, or change greeting to 'Hey team'"
                  className="flex-1 bg-[#15191E] border border-white/[0.1] focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none min-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleModify('custom_instructions');
                  }}
                />
                <button
                  onClick={() => handleModify('custom_instructions')}
                  disabled={modifying || !customModPrompt.trim()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-glow-brand disabled:opacity-40 shrink-0"
                >
                  Apply Instruction
                </button>
              </div>
            )}

            {/* Main Editing Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
              {/* Subject Line Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Subject Line
                  </label>
                  <button
                    onClick={handleCopySubject}
                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-emerald-400 transition-colors"
                  >
                    {copiedSubject ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Subject</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    pushToHistory(e.target.value, body, 'Edit Subject');
                  }}
                  placeholder="Your compelling subject line..."
                  className="w-full bg-[#101318] border border-white/[0.08] focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-sm font-semibold text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>

              {/* Email Body Editor */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    Email Body
                  </label>
                  <button
                    onClick={handleCopyBody}
                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-emerald-400 transition-colors"
                  >
                    {copiedBody ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Body</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  rows={13}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    pushToHistory(subject, e.target.value, 'Edit Body');
                  }}
                  placeholder="The generated email body will appear here. You can edit every sentence directly, reformat paragraphs, or use the quick modification buttons above."
                  className="w-full flex-1 bg-[#101318] border border-white/[0.08] focus:border-emerald-500 rounded-2xl p-4 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed resize-none custom-scrollbar font-sans"
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-[#101318] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !body}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-text-primary transition-colors disabled:opacity-40"
                  title="Save draft to database"
                >
                  <Save className={`w-3.5 h-3.5 text-emerald-400 ${saving ? 'animate-spin' : ''}`} />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  onClick={handleDiscardDraft}
                  disabled={!body && !subject}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                  title="Clear editor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Close
                </button>

                <button
                  onClick={handleUseInComposer}
                  disabled={!body.trim() || !subject.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs shadow-glow-brand transition-all disabled:opacity-40"
                  title="Transfer approved email into outreach sender"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Approve & Use in Outreach</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiEmailStudioModal;
