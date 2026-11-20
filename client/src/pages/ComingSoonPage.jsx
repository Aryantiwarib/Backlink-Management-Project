import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Construction, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Link2, 
  Target, 
  ShoppingBag, 
  FileText, 
  ShieldCheck, 
  Wrench, 
  Settings,
  Bell
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ComingSoonPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const moduleConfigs = {
    '/backlinks': {
      title: 'Backlinks Explorer & Real-Time Monitor',
      icon: Link2,
      subtitle: 'Complete backlink profile inspection, lost link alerts, anchor text distribution, and automated index status verification.',
      features: [
        'Live backlink uptime & HTTP status check (200, 301, 404)',
        'Historical backlink gain & loss tracker',
        'Toxcity score and automated disavow file generation',
        'Tiered anchor text optimization recommendations'
      ]
    },
    '/link-acquisition': {
      title: 'Link Acquisition & Outreach Automation',
      icon: Target,
      subtitle: 'Automated outreach campaigns, email sequencer, unlinked brand mention alerts, and broken link prospecting.',
      features: [
        'Cold email deliverability sequencer with custom sender rotations',
        'Automated broken link opportunities finder across 10M+ sites',
        'Competitor backlink gap analysis & copycat prospecting',
        'CRM-style pipeline for tracking outreach stages from pitch to placement'
      ]
    },
    '/marketplace': {
      title: 'Curated Backlink Marketplace',
      icon: ShoppingBag,
      subtitle: 'Verified publisher network, niche contextual link placements, and transparent pricing with no intermediaries.',
      features: [
        'Pre-vetted publishers with genuine organic traffic (>10k/mo)',
        'Guaranteed dofollow indexation within 14 days or full refund',
        'Real-time traffic trend and domain authority verification via Ahrefs/SEMrush data',
        'One-click order processing and direct editorial review'
      ]
    },
    '/content-planner': {
      title: 'SEO Content Planner & AI Studio',
      icon: FileText,
      subtitle: 'Topic clustering, automated brief generation, AI draft assistant, and scheduled CMS multi-publishing.',
      features: [
        'Semantic keyword clustering & search intent mapping',
        'Competitor content outline scraping & gap analysis',
        'Direct Webflow, WordPress, and Ghost CMS automated syncing',
        'Editorial team review workflow with internal commenting'
      ]
    },
    '/backlink-audit': {
      title: 'Deep Backlink Audit & Toxicity Shield',
      icon: ShieldCheck,
      subtitle: 'Spam link detection, algorithm penalty protection, and Google Disavow tool synchronization.',
      features: [
        'AI spam network & PBN detection algorithms',
        'Automated penalty risk rating per referring domain',
        'Single-click disavow export compliant with Google Search Console',
        'Anchor text over-optimization warning system'
      ]
    },
    '/seo-tools': {
      title: 'Enterprise SEO Toolkit',
      icon: Wrench,
      subtitle: 'SERP tracking, Core Web Vitals diagnostics, keyword difficulty checker, and technical site crawler.',
      features: [
        'Daily keyword ranking tracking with device & geo breakdown',
        'Instant Core Web Vitals (LCP, FID, CLS) diagnostic audit',
        'Canonical, robots.txt, and XML sitemap validator',
        'SERP feature tracking (Featured Snippets, People Also Ask)'
      ]
    },
    '/settings': {
      title: 'Platform Settings & Integrations',
      icon: Settings,
      subtitle: 'Manage connected domains, API access tokens, team roles, notification webhooks, and billing plans.',
      features: [
        'Google Search Console & Google Analytics 4 OAuth synchronization',
        'Slack & Discord webhooks for instant lost link notifications',
        'Custom domain white-label reporting for agencies',
        'Role-based access control (Admin, Editor, Viewer)'
      ]
    }
  };

  const currentModule = moduleConfigs[location.pathname] || {
    title: 'Module In Development',
    icon: Construction,
    subtitle: 'This section is currently undergoing development as part of the Linkora roadmap.',
    features: ['Real-time integration', 'Advanced reporting', 'Automated workflows']
  };

  const Icon = currentModule.icon;

  const handleNotifyMe = () => {
    addToast(`You will be notified when "${currentModule.title}" launches!`, 'info');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
      {/* Return Button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Hero Card */}
      <div className="surface-card rounded-2xl p-8 sm:p-10 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-glow-brand">
            <Icon className="w-7 h-7" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Module In Development</span>
              </span>
              <span className="text-xs text-text-muted font-mono">Stage 2 Roadmap</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              {currentModule.title}
            </h1>

            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
              {currentModule.subtitle}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleNotifyMe}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-tight transition-all shadow-glow-brand"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notify Me on Release</span>
              </button>

              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-primary border border-white/[0.08] transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Feature Roadmap Breakdown */}
        <div className="mt-10 pt-8 border-t border-white/[0.06]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Planned Capabilities in this Module</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentModule.features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-text-secondary leading-normal">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
