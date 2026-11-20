import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useDashboard } from '../../context/DashboardContext';
import { Target, Globe, Layers, Hash, FileText, CheckCircle2 } from 'lucide-react';

export const NewCampaignModal = ({ isOpen, onClose }) => {
  const { selectedWebsite, handleCreateCampaign } = useDashboard();

  const [formData, setFormData] = useState({
    name: '',
    targetWebsite: selectedWebsite || 'growthlabs.io',
    campaignType: 'Guest Posting',
    targetLinks: 25,
    targetKeywords: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const campaignTypes = [
    { id: 'Guest Posting', label: 'Guest Posting & Authority Outreach', desc: 'Secure in-content links on niche authoritative publications' },
    { id: 'Broken Link', label: 'Broken Link Reclamation', desc: 'Find 404 links on high-DR pages and propose your content as replacement' },
    { id: 'Resource Page', label: 'Resource Page Link Building', desc: 'Get featured on curated lists and directories in your domain' },
    { id: 'Digital PR', label: 'Digital PR & Data Studies', desc: 'Publish unique benchmark data and gain editorial brand mentions' }
  ];

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Campaign name is required';
    } else if (formData.name.trim().length < 3) {
      errs.name = 'Campaign name must be at least 3 characters';
    }

    if (!formData.targetWebsite.trim()) {
      errs.targetWebsite = 'Target website is required';
    }

    if (!formData.campaignType) {
      errs.campaignType = 'Please select a campaign type';
    }

    if (formData.targetLinks < 1 || formData.targetLinks > 500) {
      errs.targetLinks = 'Goal must be between 1 and 500 links';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    await handleCreateCampaign(formData);
    setIsSubmitting(false);

    // Reset form
    setFormData({
      name: '',
      targetWebsite: selectedWebsite || 'growthlabs.io',
      campaignType: 'Guest Posting',
      targetLinks: 25,
      targetKeywords: '',
      notes: ''
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Link Building Campaign"
      subtitle="Configure target parameters, outreach category, and acquisition goals."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campaign Name */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Campaign Name <span className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Q4 High-DR SaaS Authority Push"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              className={`w-full bg-[#111419] border ${
                errors.name ? 'border-rose-500/50' : 'border-white/[0.08]'
              } rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors`}
            />
          </div>
          {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
        </div>

        {/* Target Website & Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Target Website <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <select
                value={formData.targetWebsite}
                onChange={(e) => setFormData({ ...formData, targetWebsite: e.target.value })}
                className="w-full bg-[#111419] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
              >
                <option value="growthlabs.io">growthlabs.io (Main SaaS)</option>
                <option value="saasmetrics.co">saasmetrics.co (Resource Hub)</option>
                <option value="fintechpulse.com">fintechpulse.com (Partner)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Target Acquired Links <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                max="500"
                value={formData.targetLinks}
                onChange={(e) => setFormData({ ...formData, targetLinks: parseInt(e.target.value, 10) || '' })}
                className="w-full bg-[#111419] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            {errors.targetLinks && <p className="text-[11px] text-rose-400 mt-1">{errors.targetLinks}</p>}
          </div>
        </div>

        {/* Campaign Type Selection */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Outreach Strategy Type <span className="text-emerald-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {campaignTypes.map((type) => {
              const isSelected = formData.campaignType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setFormData({ ...formData, campaignType: type.id })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-text-primary ring-1 ring-emerald-500/20'
                      : 'bg-[#111419] border-white/[0.06] text-text-secondary hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text-primary">{type.id}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-text-muted leading-tight line-clamp-2">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Keywords / Anchor Texts */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Target Keywords & Anchors <span className="text-text-muted font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. backlink automation, seo audit tool, link management"
            value={formData.targetKeywords}
            onChange={(e) => setFormData({ ...formData, targetKeywords: e.target.value })}
            className="w-full bg-[#111419] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Campaign Brief / Notes <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <textarea
            rows="2"
            placeholder="Key target niches, minimum DR 60+, avoid blog comments, focus on DR 70+ fintech..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-[#111419] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-glow-brand disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Creating...</span>
            ) : (
              <>
                <Target className="w-3.5 h-3.5" />
                <span>Launch Campaign</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
