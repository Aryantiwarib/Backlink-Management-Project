import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Globe,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock,
  Layers,
  Link2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Code,
  Award,
  Database,
  Search,
  Filter,
  History,
  HardDrive
} from 'lucide-react';
import { seoService } from '../api/seoService';
import { backlinkService } from '../api/backlinkService';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';

export const SeoToolsPage = () => {
  const { websites, activeWebsite, switchActiveWebsite } = useWebsite();
  const { addToast } = useToast();

  const [providerStatus, setProviderStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Live SEO fetch state
  const [seoData, setSeoData] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(null);

  // Saved Database Snapshot state
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotHistory, setSnapshotHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Saved Backlinks Database state
  const [backlinks, setBacklinks] = useState([]);
  const [backlinkStats, setBacklinkStats] = useState(null);
  const [loadingBacklinks, setLoadingBacklinks] = useState(false);
  const [backlinkPage, setBacklinkPage] = useState(1);
  const [backlinkTotalPages, setBacklinkTotalPages] = useState(1);
  const [backlinkTotalCount, setBacklinkTotalCount] = useState(0);
  const [backlinkSearch, setBacklinkSearch] = useState('');
  const [backlinkFilter, setBacklinkFilter] = useState('all');

  // Fetch provider configuration status on mount
  const checkProviderStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await seoService.getProviderStatus();
      if (res && res.data) {
        setProviderStatus(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch provider status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkProviderStatus();
  }, [checkProviderStatus]);

  // Load latest stored snapshot for the active website
  const loadLatestSnapshot = useCallback(async () => {
    if (!activeWebsite) return;
    try {
      setLoadingSnapshot(true);
      const res = await seoService.getLatestSnapshot({
        websiteId: activeWebsite.id || activeWebsite._id
      });
      if (res && res.data) {
        setLatestSnapshot(res.data);
      } else {
        setLatestSnapshot(null);
      }
    } catch (err) {
      console.warn('Could not fetch latest snapshot:', err.message);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [activeWebsite]);

  // Load saved backlinks for active website
  const loadSavedBacklinks = useCallback(async (page = 1, search = '', filter = 'all') => {
    if (!activeWebsite) return;
    try {
      setLoadingBacklinks(true);
      const [listRes, statsRes] = await Promise.all([
        backlinkService.getSavedBacklinks({
          websiteId: activeWebsite.id || activeWebsite._id,
          page,
          limit: 10,
          search,
          linkType: filter
        }),
        backlinkService.getBacklinkStats({
          websiteId: activeWebsite.id || activeWebsite._id
        })
      ]);

      if (listRes && listRes.backlinks) {
        setBacklinks(listRes.backlinks);
        setBacklinkPage(listRes.pagination?.page || 1);
        setBacklinkTotalPages(listRes.pagination?.totalPages || 1);
        setBacklinkTotalCount(listRes.pagination?.total || 0);
      }

      if (statsRes && statsRes.data) {
        setBacklinkStats(statsRes.data);
      }
    } catch (err) {
      console.warn('Could not load saved backlinks:', err.message);
    } finally {
      setLoadingBacklinks(false);
    }
  }, [activeWebsite]);

  // Load historical snapshots for modal
  const loadSnapshotHistory = async () => {
    if (!activeWebsite) return;
    try {
      setLoadingHistory(true);
      const res = await seoService.getSnapshotHistory({
        websiteId: activeWebsite.id || activeWebsite._id,
        limit: 20
      });
      if (res && res.data) {
        setSnapshotHistory(res.data);
      }
    } catch (err) {
      console.warn('Could not load snapshot history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reload database data when active website changes
  useEffect(() => {
    if (activeWebsite) {
      setSeoData(null);
      setSaveConfirmation(null);
      setBacklinkPage(1);
      setBacklinkSearch('');
      setBacklinkFilter('all');
      loadLatestSnapshot();
      loadSavedBacklinks(1, '', 'all');
    }
  }, [activeWebsite, loadLatestSnapshot, loadSavedBacklinks]);

  // Determine active provider identity (defaults to 'moz')
  const activeProviderId = providerStatus?.id || seoData?.providerId || 'moz';
  const isMoz = activeProviderId === 'moz';

  // Fetch SEO metrics from provider and persist to database
  const handleFetchMetrics = async () => {
    if (!activeWebsite) {
      addToast('Please select or add a website first.', 'error');
      return;
    }

    setLoadingMetrics(true);
    setErrorInfo(null);
    setSaveConfirmation(null);

    try {
      const res = await seoService.getOverview({
        websiteId: activeWebsite.id || activeWebsite._id,
        force: forceRefresh
      });

      setSeoData(res);

      if (res.storage?.snapshotSaved) {
        setSaveConfirmation({
          snapshotId: res.storage.snapshotId,
          snapshotDate: res.storage.snapshotDate || new Date().toISOString(),
          isNewSnapshot: res.storage.isNewSnapshot,
          backlinksSaved: res.storage.backlinksSaved || 0
        });
        addToast(
          res.storage.isNewSnapshot
            ? `New SEO snapshot persisted to MongoDB for ${activeWebsite.domain}!`
            : `Updated stored snapshot timestamp in MongoDB for ${activeWebsite.domain}.`,
          'success'
        );
      } else {
        addToast(
          res.cached
            ? `Loaded cached SEO metrics for ${activeWebsite.domain} (Cost: $0)`
            : `Fetched live ${res.provider || 'SEO'} metrics for ${activeWebsite.domain}`,
          'success'
        );
      }

      // Refresh snapshot and backlinks from MongoDB
      await Promise.all([
        loadLatestSnapshot(),
        loadSavedBacklinks(1, backlinkSearch, backlinkFilter)
      ]);
    } catch (err) {
      console.error('SEO fetch error:', err);
      setErrorInfo(err);
      if (err.code === 'PROVIDER_UNCONFIGURED') {
        const missingVar = isMoz ? 'MOZ_API_TOKEN' : 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD';
        addToast(`${err.setup?.provider || 'SEO Provider'} credentials not configured (${missingVar} in server/.env).`, 'warning');
      } else {
        addToast(err.message || 'Failed to fetch SEO metrics.', 'error');
      }
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleCopyEnvSnippet = () => {
    const snippet = isMoz
      ? `MOZ_API_TOKEN=your_moz_api_token_here\nSEO_PROVIDER=moz`
      : `DATAFORSEO_LOGIN=your_login_email_here\nDATAFORSEO_PASSWORD=your_api_password_here\nSEO_PROVIDER=dataforseo`;
    navigator.clipboard.writeText(snippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
    addToast('Environment variable snippet copied to clipboard!', 'info');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadSavedBacklinks(1, backlinkSearch, backlinkFilter);
  };

  const handleFilterChange = (filterVal) => {
    setBacklinkFilter(filterVal);
    loadSavedBacklinks(1, backlinkSearch, filterVal);
  };

  const isConfigured = providerStatus?.configured;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-mono">
            <span>ANALYTICS</span>
            <span>/</span>
            <span className="text-emerald-400">SEO INTELLIGENCE & DATABASE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-emerald-400" />
            <span>SEO Intelligence & Backlink Storage</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Real external SEO metrics powered by Moz API with persistent MongoDB historical storage.
          </p>
        </div>

        {/* Website Selector */}
        {websites.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Domain:</span>
            <select
              value={activeWebsite?.id || activeWebsite?._id || ''}
              onChange={(e) => switchActiveWebsite(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#15191E] border border-white/[0.08] text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
            >
              {websites.map((w) => (
                <option key={w.id || w._id} value={w.id || w._id}>
                  {w.domain} {w.verificationStatus === 'verified' ? '✓' : '(Pending)'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Provider Status & Cost Safeguard Bar */}
      <div className="surface-card p-4 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5 fill-emerald-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">
                {providerStatus?.provider || (isMoz ? 'Moz API (Links v2)' : 'DataForSEO v3 Live API')}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {isConfigured ? 'Connected & Ready' : 'Setup Required'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Billing Model:{' '}
              <span className="text-text-secondary">
                {providerStatus?.costModel ||
                  (isMoz
                    ? 'Free Community Tier (~2,500 rows/mo, 1 req / 10s)'
                    : 'Pay-as-you-go (~$0.025 per Live query)')}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#0B0D10] border border-white/[0.06] text-text-muted flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>Storage: <strong>MongoDB Persistent</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#0B0D10] border border-white/[0.06] text-text-muted flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cost Shield: <strong>60m Cache</strong></span>
          </div>

          <a
            href={providerStatus?.docsUrl || (isMoz ? 'https://moz.com/api/docs' : 'https://docs.dataforseo.com/v3/backlinks/summary/live/')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <span>API Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Database Snapshot Info Banner */}
      <div className="p-4 rounded-2xl bg-[#111419] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">Latest Stored Snapshot:</span>
              {latestSnapshot ? (
                <span className="font-mono text-emerald-400">
                  {new Date(latestSnapshot.snapshotDate || latestSnapshot.fetchedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-text-muted italic">No snapshot stored in MongoDB yet</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              {latestSnapshot
                ? `Moz DA: ${latestSnapshot.domainAuthority ?? 'N/A'} • PA: ${latestSnapshot.pageAuthority ?? 'N/A'} • Backlinks: ${latestSnapshot.totalBacklinks !== null ? Number(latestSnapshot.totalBacklinks).toLocaleString() : 'N/A'} • Provider: ${latestSnapshot.provider}`
                : 'Fetch live metrics to initialize historical tracking for this domain.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowHistoryModal(true);
            loadSnapshotHistory();
          }}
          disabled={!activeWebsite}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
        >
          <History className="w-3.5 h-3.5 text-emerald-400" />
          <span>View Snapshot History</span>
        </button>
      </div>

      {/* Unconfigured Alert / Instructions */}
      {!isConfigured && !loadingStatus && (
        <div className="surface-card rounded-2xl p-6 border border-amber-500/30 bg-amber-500/[0.03] space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text-primary">
                {isMoz ? 'Moz API Token Not Configured' : 'DataForSEO API Credentials Not Configured'}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {isMoz ? (
                  <>
                    To fetch live Domain Authority, Page Authority, and backlink metrics, generate a free API token on your{' '}
                    <a
                      href="https://moz.com/api/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline hover:text-emerald-300"
                    >
                      Moz API Dashboard
                    </a>{' '}
                    and add it to{' '}
                    <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/[0.06]">
                      server/.env
                    </code>
                    . The Moz Community plan provides free monthly credits with no credit card required.
                  </>
                ) : (
                  <>
                    To fetch real external SEO metrics, add your DataForSEO account credentials to{' '}
                    <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/[0.06]">
                      server/.env
                    </code>
                    .
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs flex items-center justify-between text-text-muted">
            <div>
              {isMoz ? (
                <>
                  <div className="text-emerald-400">SEO_PROVIDER=moz</div>
                  <div className="text-emerald-400">MOZ_API_TOKEN=your_moz_api_token_here</div>
                </>
              ) : (
                <>
                  <div className="text-emerald-400">SEO_PROVIDER=dataforseo</div>
                  <div className="text-emerald-400">DATAFORSEO_LOGIN=your_email@example.com</div>
                  <div className="text-emerald-400">DATAFORSEO_PASSWORD=your_api_password</div>
                </>
              )}
            </div>
            <button
              onClick={handleCopyEnvSnippet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary hover:text-text-primary text-[11px] font-sans transition-colors"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <a
              href={isMoz ? 'https://moz.com/api/dashboard' : 'https://app.dataforseo.com/register'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 font-semibold transition-colors"
            >
              <span>{isMoz ? 'Get Free Moz API Token' : 'Get Free DataForSEO Account'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-[11px] text-text-muted">
              After updating <code className="text-text-secondary">server/.env</code>, click the button below to test.
            </span>
          </div>
        </div>
      )}

      {/* Target Domain & Fetch Actions */}
      <div className="surface-card p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary font-mono">
                {activeWebsite ? activeWebsite.domain : 'No Website Selected'}
              </h2>
              {activeWebsite && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    activeWebsite.verificationStatus === 'verified'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {activeWebsite.verificationStatus === 'verified' ? 'Verified Domain' : 'Pending Verification'}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {activeWebsite ? activeWebsite.name : 'Select or register a website in Website Management'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded bg-[#0B0D10] border-white/[0.1] text-emerald-500 focus:ring-0"
            />
            <span>Bypass Cache (Force Live API)</span>
          </label>

          <button
            onClick={handleFetchMetrics}
            disabled={loadingMetrics || !activeWebsite}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
            <span>{loadingMetrics ? `Calling ${isMoz ? 'Moz API' : 'DataForSEO'}...` : 'Fetch Real SEO Data'}</span>
          </button>
        </div>
      </div>

      {/* Save to Database Confirmation Banner */}
      {saveConfirmation && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 flex items-start justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-primary">
                {saveConfirmation.isNewSnapshot
                  ? 'Historical SEO Snapshot Created in MongoDB'
                  : 'Existing Snapshot Timestamp Updated in MongoDB'}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                Snapshot ID: {saveConfirmation.snapshotId} • Saved At:{' '}
                {new Date(saveConfirmation.snapshotDate).toLocaleTimeString()}
                {saveConfirmation.backlinksSaved > 0 &&
                  ` • ${saveConfirmation.backlinksSaved} backlink rows persisted`}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Database Synced
          </span>
        </div>
      )}

      {/* Error Feedback Display */}
      {errorInfo && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorInfo.message}</span>
          </div>
          {errorInfo.code && (
            <p className="text-[11px] text-rose-300/80 font-mono pl-6">
              Error Code: {errorInfo.code}
            </p>
          )}
        </div>
      )}

      {/* SEO Metrics Display (Live or Loaded) */}
      {(seoData && seoData.data) || latestSnapshot ? (
        <div className="space-y-6">
          {/* Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between text-xs text-text-muted px-2 py-1 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Provider: <strong className="text-text-primary">{seoData?.provider || latestSnapshot?.provider || 'Moz API'}</strong>
              </span>
              <span>•</span>
              <span>
                Target: <code className="text-emerald-400">{activeWebsite?.domain}</code>
              </span>
              <span>•</span>
              <span>
                Last Fetched:{' '}
                <strong className="text-text-secondary font-mono">
                  {seoData
                    ? new Date(seoData.fetchedAt).toLocaleTimeString()
                    : new Date(latestSnapshot?.snapshotDate || latestSnapshot?.fetchedAt).toLocaleString()}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              {seoData?.cached ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  ⚡ Served from Cache ($0.00)
                </span>
              ) : seoData ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  🌐 Live Provider Query ({seoData.cost || 'Free Tier'})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  💾 Loaded from MongoDB Snapshot
                </span>
              )}
            </div>
          </div>

          {/* Primary Metrics Grid */}
          {(() => {
            const current = seoData?.data || latestSnapshot;
            const daVal = current?.domainAuthority ?? current?.domainRating ?? null;
            const paVal = current?.pageAuthority ?? null;
            const totalBacklinks = current?.totalBacklinks ?? null;
            const refDomains = current?.referringDomains ?? null;
            const spamScore = current?.spamScore ?? null;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Moz Domain Authority (DA) */}
                <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isMoz ? 'Moz Domain Authority (DA)' : 'Domain Authority / Rating'}</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Available
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                      {daVal !== null ? daVal : 'N/A'}
                    </span>
                    <span className="text-xs text-text-muted">/ 100</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${Math.min(daVal || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {isMoz
                      ? 'Predictive 0–100 score developed by Moz forecasting search engine ranking ability.'
                      : 'Calculated link strength score from DataForSEO domain graph.'}
                  </p>
                </div>

                {/* Moz Page Authority (PA) */}
                {isMoz ? (
                  <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-400" />
                        <span>Moz Page Authority (PA)</span>
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Available
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-blue-400 font-mono">
                        {paVal !== null ? paVal : 'N/A'}
                      </span>
                      <span className="text-xs text-text-muted">/ 100</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        style={{ width: `${Math.min(paVal || 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Moz proprietary metric predicting ranking performance for the specific target homepage.
                    </p>
                  </div>
                ) : (
                  <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted font-medium">Link Attributes (Dofollow)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Available
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-text-primary font-mono">
                      {current?.dofollowRatio !== null ? `${current.dofollowRatio}%` : 'N/A'}
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Percentage of backlinks passing PageRank equity (rel="dofollow").
                    </p>
                  </div>
                )}

                {/* Total Backlinks */}
                <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Total Backlinks</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Available
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-text-primary tracking-tight font-mono">
                    {totalBacklinks !== null ? Number(totalBacklinks).toLocaleString() : 'N/A'}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    External hyperlinks pointing directly to this root domain.
                  </p>
                </div>

                {/* Referring Domains */}
                <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Referring Domains</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Available
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
                    {refDomains !== null ? Number(refDomains).toLocaleString() : 'N/A'}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Unique root domain names containing at least one backlink.
                  </p>
                </div>

                {/* Spam Score / Toxicity */}
                <div className="surface-card p-5 rounded-2xl border border-white/[0.06] shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">Spam Score</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Available
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary font-mono">
                      {spamScore !== null ? `${spamScore}%` : '0%'}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        (spamScore || 0) > 30
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {(spamScore || 0) > 30 ? 'Moderate/High' : 'Low Risk'}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Percentage of sites with similar backlink patterns penalized by Google.
                  </p>
                </div>

                {/* Database Persistence Status Card */}
                <div className="surface-card p-5 rounded-2xl border border-blue-500/20 bg-blue-500/[0.02] shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                      <span>MongoDB Storage</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Active
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary font-mono">
                    {backlinkTotalCount} Backlinks
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Historical snapshots and unique backlinks are stored permanently in your MongoDB database.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Moz Trademark & Attribution Notice */}
          {isMoz && (
            <div className="p-3.5 rounded-xl bg-[#0B0D10] border border-white/[0.06] text-center text-[11px] text-text-muted">
              <span>
                Data powered by <strong>Moz API v2</strong>. <em>Domain Authority</em> and <em>Page Authority</em> are registered trademarks of{' '}
                <a
                  href="https://moz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Moz, Inc.
                </a>
              </span>
            </div>
          )}

          {/* Raw JSON Payload Inspector */}
          {seoData && (
            <div className="surface-card rounded-2xl border border-white/[0.06] overflow-hidden">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between p-4 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span>Inspect Canonical Normalized API Response</span>
                </div>
                {showRawJson ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showRawJson && (
                <div className="p-4 bg-[#0B0D10] border-t border-white/[0.06]">
                  <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96 p-3 rounded-xl bg-black/60 border border-white/[0.04]">
                    {JSON.stringify(seoData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="surface-card rounded-2xl p-12 border border-white/[0.06] text-center max-w-md mx-auto my-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-brand">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Ready to Query SEO Metrics</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Click <strong>Fetch Real SEO Data</strong> to query live statistics for{' '}
              <span className="font-mono text-emerald-400">{activeWebsite?.domain || 'your domain'}</span> and save a snapshot in MongoDB.
            </p>
          </div>
          <button
            onClick={handleFetchMetrics}
            disabled={loadingMetrics || !activeWebsite}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
            <span>{loadingMetrics ? `Calling ${isMoz ? 'Moz API' : 'DataForSEO'}...` : 'Fetch Real SEO Data'}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 5: SAVED BACKLINKS DATABASE SECTION                                 */}
      {/* ========================================================================= */}
      <div className="surface-card rounded-2xl border border-white/[0.06] shadow-card overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">
                  Saved Backlinks Database
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-text-muted border border-white/[0.08]">
                  {backlinkTotalCount} Total Records
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Backlinks stored in MongoDB for <span className="font-mono text-emerald-400">{activeWebsite?.domain}</span>
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search anchor or URL..."
                value={backlinkSearch}
                onChange={(e) => setBacklinkSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.08] rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 w-44 sm:w-56"
              />
            </form>

            <div className="flex items-center gap-1 bg-[#0B0D10] p-1 rounded-xl border border-white/[0.08] text-xs">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  backlinkFilter === 'all'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('dofollow')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  backlinkFilter === 'dofollow'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Dofollow
              </button>
              <button
                onClick={() => handleFilterChange('nofollow')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  backlinkFilter === 'nofollow'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Nofollow
              </button>
            </div>

            <button
              onClick={() => loadSavedBacklinks(backlinkPage, backlinkSearch, backlinkFilter)}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-colors"
              title="Refresh Backlinks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBacklinks ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Backlinks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/20 text-text-muted font-mono text-[11px]">
                <th className="py-3 px-4 font-medium">SOURCE PAGE</th>
                <th className="py-3 px-4 font-medium">TARGET URL</th>
                <th className="py-3 px-4 font-medium">ANCHOR TEXT</th>
                <th className="py-3 px-4 font-medium">TYPE</th>
                <th className="py-3 px-4 font-medium">AUTHORITY</th>
                <th className="py-3 px-4 font-medium">FETCHED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loadingBacklinks ? (
                // Loading Skeleton Rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-48" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-36" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-24" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-16" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-12" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-white/[0.06] rounded w-20" /></td>
                  </tr>
                ))
              ) : backlinks.length > 0 ? (
                backlinks.map((link) => (
                  <tr key={link.id || link._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono max-w-xs truncate">
                      <a
                        href={link.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:text-emerald-400 flex items-center gap-1.5 group"
                      >
                        <span className="truncate">{link.sourceUrl}</span>
                        <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 font-mono max-w-xs truncate text-text-muted">
                      {link.targetUrl}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-secondary max-w-[180px] truncate">
                      {link.anchorText ? (
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] font-mono text-[11px]">
                          {link.anchorText}
                        </span>
                      ) : (
                        <span className="text-text-muted italic">No anchor text</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          link.linkType === 'dofollow'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : link.linkType === 'nofollow'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-white/[0.04] text-text-muted border border-white/[0.06]'
                        }`}
                      >
                        {link.linkType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {link.sourceDomainAuthority !== null ? (
                        <span className="text-emerald-400 font-semibold">
                          DA {link.sourceDomainAuthority}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono text-[11px]">
                      {new Date(link.fetchedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted space-y-2">
                    <Database className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                    <p className="text-sm font-medium text-text-secondary">No Saved Backlinks in Database</p>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      {backlinkSearch || backlinkFilter !== 'all'
                        ? 'No backlinks matched your search filter.'
                        : `No backlinks are stored yet for ${activeWebsite?.domain || 'this website'}. Fetch live SEO data or query links to populate the database.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {backlinkTotalPages > 1 && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted">
            <div>
              Showing page <strong className="text-text-primary">{backlinkPage}</strong> of{' '}
              <strong className="text-text-primary">{backlinkTotalPages}</strong> ({backlinkTotalCount} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadSavedBacklinks(backlinkPage - 1, backlinkSearch, backlinkFilter)}
                disabled={backlinkPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => loadSavedBacklinks(backlinkPage + 1, backlinkSearch, backlinkFilter)}
                disabled={backlinkPage >= backlinkTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HISTORICAL SNAPSHOTS MODAL                                                */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="surface-card rounded-2xl border border-white/[0.08] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-text-primary">Historical SEO Snapshots</h3>
                  <p className="text-xs text-text-muted">
                    Time-series metric records for <span className="font-mono text-emerald-400">{activeWebsite?.domain}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading historical snapshots...</span>
                </div>
              ) : snapshotHistory.length > 0 ? (
                <div className="space-y-2.5">
                  {snapshotHistory.map((snap) => (
                    <div
                      key={snap.id || snap._id}
                      className="p-3.5 rounded-xl bg-[#0B0D10] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-text-primary">
                            {new Date(snap.snapshotDate).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-text-muted">
                            {snap.provider}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono">
                          <span>DA: <strong className="text-emerald-400">{snap.domainAuthority ?? 'N/A'}</strong></span>
                          <span>PA: <strong className="text-blue-400">{snap.pageAuthority ?? 'N/A'}</strong></span>
                          <span>Backlinks: <strong className="text-text-secondary">{snap.totalBacklinks !== null ? Number(snap.totalBacklinks).toLocaleString() : 'N/A'}</strong></span>
                          <span>Ref Domains: <strong className="text-text-secondary">{snap.referringDomains !== null ? Number(snap.referringDomains).toLocaleString() : 'N/A'}</strong></span>
                          <span>Spam: <strong className="text-text-secondary">{snap.spamScore !== null ? `${snap.spamScore}%` : 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-text-muted space-y-1">
                  <p>No historical snapshots saved yet.</p>
                  <p className="text-[11px]">When you query live metrics, snapshots are recorded automatically.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.06] bg-black/30 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
