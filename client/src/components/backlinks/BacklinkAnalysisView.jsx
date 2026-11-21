import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  ShieldCheck,
  Globe,
  FileText,
  Target,
  Award,
  AlertCircle,
  Wrench,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { backlinkService } from '../../api/backlinkService';
import { formatNumber } from '../../utils/formatters';

const DONUT_COLORS = {
  dofollow: '#10B981',
  nofollow: '#3B82F6',
  unknown: '#6B7280'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#15191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-2.5 shadow-elevated text-xs font-sans">
        <span className="font-semibold text-text-primary block mb-1">{data.name || label}</span>
        <span className="text-text-muted">
          Count: <span className="font-mono font-bold text-text-primary">{formatNumber(data.value)}</span>
        </span>
      </div>
    );
  }
  return null;
};

export const BacklinkAnalysisView = ({ websiteId, domain }) => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalysis = async () => {
      if (!websiteId && !domain) return;
      try {
        setLoading(true);
        setError(null);
        const res = await backlinkService.getBacklinkAnalysis({ websiteId, domain });
        if (isMounted && res && res.success) {
          setAnalysis(res.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load backlink analysis:', err);
          setError(err.message || 'Failed to retrieve analysis.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      isMounted = false;
    };
  }, [websiteId, domain]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card rounded-2xl p-6 border border-white/[0.06] animate-pulse h-80" />
          <div className="surface-card rounded-2xl p-6 border border-white/[0.06] animate-pulse h-80" />
        </div>
        <div className="surface-card rounded-2xl p-6 border border-white/[0.06] animate-pulse h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-2xl p-8 border border-rose-500/20 text-center max-w-md mx-auto my-8 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-text-primary">Failed to Load Backlink Analysis</h3>
        <p className="text-xs text-text-muted leading-relaxed">{error}</p>
      </div>
    );
  }

  const hasData = analysis && analysis.hasData;

  if (!hasData) {
    return (
      <div className="surface-card rounded-2xl border border-white/[0.06] p-12 text-center space-y-4 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
          <Award className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-sm font-bold text-text-primary">
            Insufficient Backlink Data for Analysis
          </h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            There are currently no backlink records indexed for <span className="text-emerald-400 font-mono">{domain}</span> in MongoDB. Backlink analysis aggregations require stored records.
          </p>
        </div>
        <button
          onClick={() => navigate('/seo-tools')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-glow-brand"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Sync Data in SEO Tools</span>
        </button>
      </div>
    );
  }

  const {
    stats = {},
    topReferringDomains = [],
    topAnchorTexts = [],
    topTargetPages = [],
    linkTypeDistribution = [],
    domainAuthorityDistribution = []
  } = analysis;

  // Format link equity donut data
  const pieData = linkTypeDistribution.map((item) => ({
    name: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Unknown',
    value: item.count,
    color: DONUT_COLORS[item.type?.toLowerCase()] || '#6B7280'
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Row 1: Link Equity Donut + Top Referring Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Link Equity Donut */}
        <div className="surface-card rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-between shadow-card">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  Link Equity Distribution
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Dofollow vs Nofollow ratio
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="h-52 relative mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#101318" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold font-mono text-text-primary">
                  {stats.dofollowRatio || 0}%
                </span>
                <span className="text-[10px] text-text-muted uppercase font-semibold">
                  Dofollow
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.04] text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
                <span className="text-[10px] text-text-muted block">Dofollow Links</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatNumber(stats.dofollowCount || 0)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/[0.05] border border-blue-500/15">
                <span className="text-[10px] text-text-muted block">Nofollow Links</span>
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {formatNumber(stats.nofollowCount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Referring Domains */}
        <div className="lg:col-span-2 surface-card rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-between shadow-card">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  Top Referring Domains
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Root domains providing the highest backlink volume
                </p>
              </div>
              <Globe className="w-4 h-4 text-text-muted" />
            </div>

            {topReferringDomains.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No referring domains analyzed yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03] mt-2">
                {topReferringDomains.slice(0, 6).map((item, idx) => (
                  <div key={item.domain} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-text-muted w-4 flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-text-primary truncate">
                        {item.domain}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {item.avgDA !== null && (
                        <span className="font-mono text-[11px] text-text-muted px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                          DA {item.avgDA}
                        </span>
                      )}
                      <div className="text-right">
                        <span className="font-mono font-bold text-text-primary">
                          {formatNumber(item.count)}
                        </span>
                        <span className="text-[10px] text-text-muted ml-1">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Top Anchor Texts + Most Linked Target Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Anchor Texts */}
        <div className="surface-card rounded-2xl p-6 border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-tight">
                Top Anchor Texts
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Most frequent anchor keywords linking to your domain
              </p>
            </div>
            <FileText className="w-4 h-4 text-text-muted" />
          </div>

          {topAnchorTexts.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">
              No anchor text data recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {topAnchorTexts.slice(0, 6).map((anchor, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary truncate max-w-xs italic">
                      "{anchor.anchorText}"
                    </span>
                    <span className="font-mono text-[11px] text-text-muted flex-shrink-0">
                      {formatNumber(anchor.count)} links ({anchor.percentage}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(anchor.percentage * 2, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Linked Landing Pages */}
        <div className="surface-card rounded-2xl p-6 border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-tight">
                Most Linked Landing Pages
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Pages receiving the highest inbound backlink equity
              </p>
            </div>
            <Target className="w-4 h-4 text-text-muted" />
          </div>

          {topTargetPages.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">
              No landing pages indexed yet.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {topTargetPages.slice(0, 6).map((page, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-text-muted w-4 flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-[11px] text-text-secondary truncate" title={page.targetUrl}>
                      {page.targetUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-text-primary flex-shrink-0">
                    {formatNumber(page.count)} links
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Domain Authority Tier Distribution */}
      {domainAuthorityDistribution.length > 0 && (
        <div className="surface-card rounded-2xl p-6 border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-tight">
                Referring Page Domain Authority Distribution
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Distribution of source linking pages categorized by Moz DA tiers
              </p>
            </div>
            <Award className="w-4 h-4 text-text-muted" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {domainAuthorityDistribution.map((tier) => (
              <div
                key={tier.tier}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between"
              >
                <span className="text-[11px] font-medium text-text-muted">{tier.tier}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono text-text-primary">
                    {formatNumber(tier.count)}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-400">
                    {tier.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
