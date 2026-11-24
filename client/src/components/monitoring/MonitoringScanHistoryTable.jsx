import React from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Sparkles,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';

export const MonitoringScanHistoryTable = ({ scans = [], loading = false, pagination, onPageChange }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.05] text-text-muted">
            {status}
          </span>
        );
    }
  };

  const formatDuration = (ms) => {
    if (!ms || ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/[0.08]">
        <h3 className="text-sm font-bold text-text-primary">Scan History & Audit Trail</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Complete log of past scheduled and manual crawls with change detection metrics.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Trigger</th>
              <th className="py-3 px-4 font-medium">Scan Date</th>
              <th className="py-3 px-4 font-medium">Duration</th>
              <th className="py-3 px-4 font-medium">Links Checked</th>
              <th className="py-3 px-4 font-medium">Differences</th>
              <th className="py-3 px-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-muted">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-400 mb-2" />
                  Loading scan records...
                </td>
              </tr>
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-muted">
                  No scan records found. Run your first scan to begin monitoring.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(scan.scanStatus)}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap capitalize text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <PlayCircle className="w-3 h-3 text-text-muted" />
                      {scan.triggerType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-text-primary font-medium">
                    {formatDate(scan.scanStartedAt)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-text-muted font-mono">
                    {formatDuration(scan.durationMs)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-text-secondary">
                    {scan.backlinksChecked || 0} links
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {scan.isBaseline ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Baseline Established
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {scan.newBacklinksCount > 0 && (
                          <span className="text-emerald-400 font-semibold font-mono">
                            +{scan.newBacklinksCount}
                          </span>
                        )}
                        {scan.lostBacklinksCount > 0 && (
                          <span className="text-rose-400 font-semibold font-mono">
                            -{scan.lostBacklinksCount}
                          </span>
                        )}
                        {scan.changedBacklinksCount > 0 && (
                          <span className="text-amber-400 font-semibold font-mono">
                            ~{scan.changedBacklinksCount}
                          </span>
                        )}
                        {scan.newBacklinksCount === 0 &&
                          scan.lostBacklinksCount === 0 &&
                          scan.changedBacklinksCount === 0 && (
                            <span className="text-text-muted">No changes</span>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-text-muted">
                    {scan.errorMessage ? (
                      <span className="text-rose-400 truncate max-w-xs block" title={scan.errorMessage}>
                        {scan.errorMessage}
                      </span>
                    ) : scan.isBaseline ? (
                      <span className="text-text-muted text-[11px]">Initial snapshot baseline</span>
                    ) : (
                      <span className="text-text-muted text-[11px]">Healthy diff</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted bg-[#101419]">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} scans)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringScanHistoryTable;
