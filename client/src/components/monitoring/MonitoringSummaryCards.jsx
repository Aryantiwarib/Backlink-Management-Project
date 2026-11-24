import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Activity,
  AlertTriangle
} from 'lucide-react';

export const MonitoringSummaryCards = ({ summary, loading, onTriggerScan, scanInProgress }) => {
  const settings = summary?.settings || {};
  const stats = summary?.stats || {};
  const isEnabled = settings.enabled;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not yet scanned';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Monitoring Status Card */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Monitoring Status</span>
          <div
            className={`p-2 rounded-xl border ${
              scanInProgress || settings.isScanning
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : isEnabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.08] text-text-muted'
            }`}
          >
            {scanInProgress || settings.isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : isEnabled ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Shield className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                scanInProgress || settings.isScanning
                  ? 'bg-amber-400 animate-ping'
                  : isEnabled
                  ? 'bg-emerald-400'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-lg font-bold text-text-primary capitalize">
              {scanInProgress || settings.isScanning
                ? 'Scanning Now...'
                : isEnabled
                ? 'Active & Protected'
                : 'Paused'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            {isEnabled
              ? `Running on ${settings.frequency || 'weekly'} scan cadence`
              : 'Automated scans currently paused'}
          </p>
        </div>
      </div>

      {/* 2. Last & Next Scan Times */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Scan Schedule</span>
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Last Scan:</span>
            <span className="text-text-primary font-medium">
              {formatRelativeTime(settings.lastScanAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Next Scan:</span>
            <span className="text-blue-400 font-medium">
              {isEnabled ? formatDate(settings.nextScanAt) : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. New & Recovered Links */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">New Backlinks</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <PlusCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-emerald-400">
              +{stats.newBacklinksCount ?? 0}
            </span>
            <span className="text-xs text-text-muted ml-2">detected</span>
          </div>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Gained
          </span>
        </div>
      </div>

      {/* 4. Lost & Changed Links */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Lost / Changes</span>
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <MinusCircle className="w-3.5 h-3.5" />
            </div>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-400">
                -{stats.lostBacklinksCount ?? 0}
              </span>
              <span className="text-[11px] text-text-muted">lost</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-lg font-bold text-amber-400">
                {stats.changedBacklinksCount ?? 0}
              </span>
              <span className="text-[11px] text-text-muted">modified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringSummaryCards;
