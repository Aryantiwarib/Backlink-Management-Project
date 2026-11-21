import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Plus,
  ShieldCheck,
  Clock,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  Zap,
  Filter,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Wrench
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { WebsiteStatusBadge } from '../components/websites/WebsiteStatusBadge';
import { AddWebsiteModal } from '../components/websites/AddWebsiteModal';
import { EditWebsiteModal } from '../components/websites/EditWebsiteModal';
import { DnsVerificationModal } from '../components/websites/DnsVerificationModal';
import { DeleteWebsiteModal } from '../components/websites/DeleteWebsiteModal';

export const WebsiteManagementPage = () => {
  const navigate = useNavigate();
  const {
    websites,
    activeWebsite,
    loading,
    error,
    fetchWebsites,
    switchActiveWebsite
  } = useWebsite();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'verified' | 'pending'

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dnsModalOpen, setDnsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState(null);

  // Filtered websites
  const filteredWebsites = useMemo(() => {
    return websites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.domain.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || site.verificationStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [websites, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = websites.length;
    const verified = websites.filter((w) => w.verificationStatus === 'verified').length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [websites]);

  const handleOpenEdit = (site) => {
    setSelectedWebsite(site);
    setEditModalOpen(true);
  };

  const handleOpenDns = (site) => {
    setSelectedWebsite(site);
    setDnsModalOpen(true);
  };

  const handleOpenDelete = (site) => {
    setSelectedWebsite(site);
    setDeleteModalOpen(true);
  };

  const handleWebsiteAdded = (newSite) => {
    // Optionally open DNS verification modal for the newly added website
    setSelectedWebsite(newSite);
    setDnsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-mono">
            <span>WORKSPACE</span>
            <span>/</span>
            <span className="text-emerald-400">WEBSITE MANAGEMENT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Websites & Domains
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage your tracked domains, verify DNS ownership, and set your active workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchWebsites()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#15191E] border border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-white/[0.14] transition-colors"
            title="Refresh websites"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Website</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Websites */}
        <div className="surface-card p-4 rounded-2xl border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Total Websites</span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-text-primary tracking-tight">
            {stats.total}
          </div>
          <p className="text-[11px] text-text-muted mt-1">Registered in account</p>
        </div>

        {/* Verified Domains */}
        <div className="surface-card p-4 rounded-2xl border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Verified Domains</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400 tracking-tight">
            {stats.verified}
          </div>
          <p className="text-[11px] text-text-muted mt-1">DNS ownership confirmed</p>
        </div>

        {/* Pending Verification */}
        <div className="surface-card p-4 rounded-2xl border border-white/[0.06] shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Pending Verification</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-400 tracking-tight">
            {stats.pending}
          </div>
          <p className="text-[11px] text-text-muted mt-1">Requires TXT record</p>
        </div>

        {/* Active Workspace */}
        <div className="surface-card p-4 rounded-2xl border border-emerald-500/20 shadow-card bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Active Workspace</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4 fill-emerald-400/20" />
            </div>
          </div>
          <div className="mt-2 text-base font-bold text-text-primary font-mono truncate">
            {activeWebsite ? activeWebsite.domain : 'None Selected'}
          </div>
          <p className="text-[11px] text-text-muted mt-1 truncate">
            {activeWebsite ? activeWebsite.name : 'Select or add a website'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-3 rounded-2xl border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or domain..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0B0D10] border border-white/[0.08] focus:border-emerald-500/50 text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto p-1 bg-[#0B0D10] rounded-xl border border-white/[0.06]">
          {[
            { id: 'all', label: 'All Domains', count: stats.total },
            { id: 'verified', label: 'Verified', count: stats.verified },
            { id: 'pending', label: 'Pending', count: stats.pending }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Websites List */}
      {loading && websites.length === 0 ? (
        /* Loading skeleton */
        <div className="surface-card rounded-2xl p-12 border border-white/[0.06] flex flex-col items-center justify-center text-text-muted space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading your websites...</p>
        </div>
      ) : filteredWebsites.length === 0 ? (
        /* Empty State */
        <div className="surface-card rounded-2xl p-12 border border-white/[0.06] text-center max-w-md mx-auto my-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-brand">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">
              {websites.length === 0 ? 'No Websites Added Yet' : 'No Matching Websites'}
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              {websites.length === 0
                ? 'Add your first domain to start monitoring backlink health, acquisition campaigns, and SEO performance.'
                : 'No websites match your current search or status filter criteria.'}
            </p>
          </div>
          {websites.length === 0 ? (
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Your First Website</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs text-emerald-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* Website Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWebsites.map((site) => {
            const isSiteActive = activeWebsite && (activeWebsite.id === site.id || activeWebsite._id === site.id);
            const isVerified = site.verificationStatus === 'verified';

            return (
              <div
                key={site.id || site._id}
                className={`surface-card rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSiteActive
                    ? 'border-emerald-500/40 bg-gradient-to-b from-[#15191E] to-[#121915]/60 shadow-glow-sm'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {/* Active Indicator Top Ribbon */}
                {isSiteActive && (
                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
                )}

                <div>
                  {/* Top Meta row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-text-secondary border border-white/[0.08]'
                      }`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text-primary tracking-tight">
                            {site.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-text-secondary hover:text-emerald-400 flex items-center gap-1 transition-colors"
                          >
                            <span>{site.domain}</span>
                            <ExternalLink className="w-3 h-3 text-text-muted" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <WebsiteStatusBadge status={site.verificationStatus} />
                  </div>

                  {/* Description */}
                  {site.description && (
                    <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed">
                      {site.description}
                    </p>
                  )}

                  {/* Details stats */}
                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/[0.04] text-[11px] text-text-muted mb-4">
                    <div>
                      <span className="block text-[10px] text-text-muted/70 uppercase">Added On</span>
                      <span className="text-text-secondary font-mono">
                        {new Date(site.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted/70 uppercase">Verification</span>
                      <span className={isVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {isVerified ? 'DNS TXT Verified' : 'DNS TXT Required'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Left: Active workspace button/badge */}
                  <div>
                    {isSiteActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active Workspace</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => switchActiveWebsite(site.id || site._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-400 border border-white/[0.08] hover:border-emerald-500/30 text-xs font-medium transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Set as Active</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Actions (Verify, Edit, Delete) */}
                  <div className="flex items-center gap-1.5">
                    {!isVerified && (
                      <button
                        onClick={() => handleOpenDns(site)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 text-xs font-semibold transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify DNS</span>
                      </button>
                    )}

                    {isVerified && (
                      <button
                        onClick={() => handleOpenDns(site)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                        title="View DNS details"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        switchActiveWebsite(site.id || site._id);
                        navigate('/seo-tools');
                      }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="View SEO Intelligence"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(site)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                      title="Edit website details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenDelete(site)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete website"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddWebsiteModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onWebsiteAdded={handleWebsiteAdded}
      />

      <EditWebsiteModal
        isOpen={editModalOpen}
        website={selectedWebsite}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedWebsite(null);
        }}
      />

      <DnsVerificationModal
        isOpen={dnsModalOpen}
        website={selectedWebsite}
        onClose={() => {
          setDnsModalOpen(false);
          setSelectedWebsite(null);
        }}
      />

      <DeleteWebsiteModal
        isOpen={deleteModalOpen}
        website={selectedWebsite}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedWebsite(null);
        }}
      />
    </div>
  );
};
