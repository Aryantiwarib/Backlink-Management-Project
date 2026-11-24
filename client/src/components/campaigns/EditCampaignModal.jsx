import React, { useState, useEffect } from 'react';
import { X, Edit2, Target, Calendar } from 'lucide-react';

const CAMPAIGN_TYPES = [
  'General Link Building',
  'Guest Posting',
  'Competitor Link Acquisition',
  'Resource Page Outreach',
  'Broken Link Building',
  'Directory Submission',
  'Digital PR'
];

export const EditCampaignModal = ({ campaign, isOpen, onClose, onUpdate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('General Link Building');
  const [objective, setObjective] = useState('');
  const [targetBacklinks, setTargetBacklinks] = useState(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setDescription(campaign.description || '');
      setCampaignType(campaign.campaignType || 'General Link Building');
      setObjective(campaign.objective || '');
      setTargetBacklinks(campaign.targetBacklinks ?? 25);
      setStartDate(
        campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : ''
      );
      setEndDate(
        campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : ''
      );
      setStatus(campaign.status || 'active');
      setError('');
    }
  }, [campaign]);

  if (!isOpen || !campaign) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    if (targetBacklinks < 0) {
      setError('Target backlinks cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      const updatePayload = {
        name: name.trim(),
        description: description.trim(),
        campaignType,
        objective: objective.trim(),
        targetBacklinks: Number(targetBacklinks),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status
      };
      await onUpdate(updatePayload, campaign.id || campaign._id);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Edit Campaign Settings</h3>
              <p className="text-xs text-text-muted">{campaign.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Campaign Name */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
              Campaign Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Campaign Type & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Strategy / Campaign Type
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Campaign Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Target Backlinks & Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Target Backlinks Goal
              </label>
              <input
                type="number"
                min="0"
                value={targetBacklinks}
                onChange={(e) => setTargetBacklinks(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
              Strategic Objective
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCampaignModal;
