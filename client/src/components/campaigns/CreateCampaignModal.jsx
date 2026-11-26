import React, { useState } from 'react';
import {
  X,
  Rocket,
  Calendar,
  Target,
  Sparkles,
  Sliders,
  Search,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const CAMPAIGN_TYPES = [
  'General Link Building',
  'Guest Posting',
  'Competitor Link Acquisition',
  'Resource Page Outreach',
  'Broken Link Building',
  'Directory Submission',
  'Digital PR'
];

const SUGGESTED_NICHES = [
  'Web Development',
  'SaaS & Cloud Tools',
  'Digital Marketing & SEO',
  'Artificial Intelligence & ML',
  'Technology & Hardware',
  'E-commerce & Retail',
  'Finance & Fintech',
  'Health & Wellness',
  'Education & EdTech'
];

export const CreateCampaignModal = ({ isOpen, onClose, onCreate }) => {
  const [activeStep, setActiveStep] = useState('basic'); // 'basic' | 'discovery' | 'qualification'

  // Basic Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('General Link Building');
  const [objective, setObjective] = useState('');
  const [targetBacklinks, setTargetBacklinks] = useState(25);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('active');

  // Niche and Discovery Configuration
  const [niche, setNiche] = useState('');
  const [primaryKeywords, setPrimaryKeywords] = useState('');
  const [additionalKeywords, setAdditionalKeywords] = useState('');
  const [competitorDomains, setCompetitorDomains] = useState('');
  const [targetProspects, setTargetProspects] = useState(50);

  // Qualification Criteria
  const [minDomainAuthority, setMinDomainAuthority] = useState(20);
  const [minPageAuthority, setMinPageAuthority] = useState(0);
  const [maxSpamScore, setMaxSpamScore] = useState(30);
  const [minOpportunityScore, setMinOpportunityScore] = useState(40);
  const [excludedDomains, setExcludedDomains] = useState('');
  const [excludeContacted, setExcludeContacted] = useState(true);
  const [excludeRejected, setExcludeRejected] = useState(true);

  // Discovery Sources
  const [enableKeywordDiscovery, setEnableKeywordDiscovery] = useState(true);
  const [enableCompetitorDiscovery, setEnableCompetitorDiscovery] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      setActiveStep('basic');
      return;
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      setActiveStep('basic');
      return;
    }

    // Process lists
    const cleanPrimaryKws = primaryKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const cleanAdditionalKws = additionalKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const cleanCompetitors = competitorDomains
      .split(',')
      .map((c) => c.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, ''))
      .filter(Boolean);

    const cleanExcludedDomains = excludedDomains
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, ''))
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      campaignType,
      objective: objective.trim(),
      targetBacklinks: Number(targetBacklinks) || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      status,
      // Phase 10 Upgrade
      niche: niche.trim(),
      primaryKeywords: cleanPrimaryKws,
      additionalKeywords: cleanAdditionalKws,
      competitorDomains: cleanCompetitors,
      targetProspects: Number(targetProspects) || 50,
      qualificationCriteria: {
        minDomainAuthority: Number(minDomainAuthority) || 0,
        minPageAuthority: Number(minPageAuthority) || 0,
        maxSpamScore: Number(maxSpamScore) || 100,
        minOpportunityScore: Number(minOpportunityScore) || 0,
        relevantCategories: [],
        excludedDomains: cleanExcludedDomains,
        excludeContacted,
        excludeRejected
      },
      discoverySources: {
        enableKeywordDiscovery,
        enableCompetitorDiscovery
      },
      autoDiscover: true
    };

    setLoading(true);
    try {
      await onCreate(payload);

      // Reset Form
      setName('');
      setDescription('');
      setObjective('');
      setNiche('');
      setPrimaryKeywords('');
      setAdditionalKeywords('');
      setCompetitorDomains('');
      setExcludedDomains('');
      setActiveStep('basic');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Create Automated Link Building Campaign
              </h3>
              <p className="text-xs text-text-muted">
                Define goals, niche criteria, and let LINKORA automatically discover & qualify prospects.
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

        {/* Step Navigation Tabs */}
        <div className="flex border-b border-white/[0.06] bg-[#0E1217] px-6 text-xs">
          <button
            type="button"
            onClick={() => setActiveStep('basic')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors ${
              activeStep === 'basic'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            1. Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('discovery')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors ${
              activeStep === 'discovery'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            2. Niche & Discovery
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('qualification')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors ${
              activeStep === 'qualification'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            3. Qualification & Filters
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BASIC INFORMATION */}
          {activeStep === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
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
                  placeholder="e.g. Q4 High-DA SaaS Guest Outreach"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Strategy & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                    Campaign Strategy Type <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
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
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 capitalize"
                  >
                    <option value="active">Active (Start discovery immediately)</option>
                    <option value="draft">Draft (Configure first)</option>
                    <option value="paused">Paused</option>
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
                    min="1"
                    value={targetBacklinks}
                    onChange={(e) => setTargetBacklinks(e.target.value)}
                    placeholder="25"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Strategic Objective */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Strategic Objective (Optional)
                </label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Elevate domain authority and acquire 15 in-content dofollow backlinks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Campaign Description & Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Editorial requirements, pitch guidelines, target anchor texts..."
                  className="w-full p-3 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: NICHE & DISCOVERY CONFIGURATION */}
          {activeStep === 'discovery' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Campaign Niche / Industry */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Campaign Niche / Industry <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Web Development, SaaS, Cybersecurity, Digital Marketing..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
                {/* Suggested niches chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-text-muted">Suggestions:</span>
                  {SUGGESTED_NICHES.slice(0, 5).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNiche(sug)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-white/[0.04] hover:bg-emerald-500/20 text-text-secondary hover:text-emerald-400 border border-white/[0.06] transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Keywords */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Primary Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={primaryKeywords}
                  onChange={(e) => setPrimaryKeywords(e.target.value)}
                  placeholder="e.g. react js, nodejs tutorials, frontend frameworks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Used by the search discovery engine to locate high-relevance blogs, resource pages, and guest posting opportunities.
                </p>
              </div>

              {/* Additional Keywords */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Additional Keywords (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={additionalKeywords}
                  onChange={(e) => setAdditionalKeywords(e.target.value)}
                  placeholder="e.g. web developer resources, javascript libraries"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Competitor Domains */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Competitor Domains (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={competitorDomains}
                  onChange={(e) => setCompetitorDomains(e.target.value)}
                  placeholder="e.g. competitor1.com, competitor2.io"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  LINKORA extracts backlink profiles from these competitors to discover referring publications linking to them.
                </p>
              </div>

              {/* Target Number of Prospects */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Target Number of Prospects to Discover & Assign
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={targetProspects}
                  onChange={(e) => setTargetProspects(e.target.value)}
                  placeholder="50"
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 3: QUALIFICATION & SOURCES */}
          {activeStep === 'qualification' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Discovery Sources */}
              <div className="p-3.5 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
                <span className="text-[11px] font-semibold text-text-primary block">
                  Discovery Sources
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] cursor-pointer hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={enableKeywordDiscovery}
                      onChange={(e) => setEnableKeywordDiscovery(e.target.checked)}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-text-primary block">Keyword Search Discovery</span>
                      <span className="text-[10px] text-text-muted">Serper / Google search queries</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] cursor-pointer hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={enableCompetitorDiscovery}
                      onChange={(e) => setEnableCompetitorDiscovery(e.target.checked)}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-text-primary block">Competitor Backlinks</span>
                      <span className="text-[10px] text-text-muted">Moz competitor link analysis</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* SEO Qualification Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Minimum Domain Authority (DA: {minDomainAuthority})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minDomainAuthority}
                    onChange={(e) => setMinDomainAuthority(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[10px] text-text-muted">Recommended: 20+</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Maximum Spam Score ({maxSpamScore}%)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={maxSpamScore}
                    onChange={(e) => setMaxSpamScore(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                  <span className="text-[10px] text-text-muted">Recommended: &lt; 30%</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Minimum Opportunity Score ({minOpportunityScore} / 100)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minOpportunityScore}
                    onChange={(e) => setMinOpportunityScore(Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                  <span className="text-[10px] text-text-muted">Recommended: 50+</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Minimum Page Authority (PA: {minPageAuthority})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minPageAuthority}
                    onChange={(e) => setMinPageAuthority(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <span className="text-[10px] text-text-muted">Optional</span>
                </div>
              </div>

              {/* Exclusion Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeContacted}
                    onChange={(e) => setExcludeContacted(e.target.checked)}
                    className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0"
                  />
                  <span className="text-text-secondary">
                    Exclude previously contacted prospects across all campaigns
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeRejected}
                    onChange={(e) => setExcludeRejected(e.target.checked)}
                    className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0"
                  />
                  <span className="text-text-secondary">
                    Exclude previously rejected prospects across all campaigns
                  </span>
                </label>
              </div>

              {/* Excluded Domains */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Excluded Domains (Comma-separated)
                </label>
                <input
                  type="text"
                  value={excludedDomains}
                  onChange={(e) => setExcludedDomains(e.target.value)}
                  placeholder="e.g. partner-domain.com, blacklisted-site.net"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              {activeStep !== 'basic' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep(activeStep === 'qualification' ? 'discovery' : 'basic')
                  }
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-text-secondary transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-text-secondary transition-colors"
              >
                Cancel
              </button>

              {activeStep !== 'qualification' ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep(activeStep === 'basic' ? 'discovery' : 'qualification')
                  }
                  className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-text-primary font-semibold text-xs transition-colors"
                >
                  Continue &rarr;
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{loading ? 'Creating & Discovering...' : 'Find & Assign Prospects'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
