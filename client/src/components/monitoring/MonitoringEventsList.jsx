import React, { useState } from 'react';
import {
  ExternalLink,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Activity,
  CheckCheck,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  Globe,
  Filter
} from 'lucide-react';

export const MonitoringEventsList = ({
  events = [],
  unreadCount = 0,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  activeFilter = 'all',
  onFilterChange,
  pagination,
  onPageChange
}) => {
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await onMarkAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'new_backlink':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PlusCircle className="w-3 h-3" />
            New Backlink
          </span>
        );
      case 'lost_backlink':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <MinusCircle className="w-3 h-3" />
            Lost Backlink
          </span>
        );
      case 'backlink_changed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-3 h-3" />
            Attribute Changed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.05] text-text-muted border border-white/[0.1]">
            <Info className="w-3 h-3" />
            Event
          </span>
        );
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
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
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-text-primary">Detected Backlink Events</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Detailed chronological record of new, dropped, and modified backlinks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] overflow-x-auto text-xs bg-[#101419]">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'new_backlink', label: 'New Links' },
          { id: 'lost_backlink', label: 'Lost Links' },
          { id: 'backlink_changed', label: 'Changed Links' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab.id
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events List Body */}
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">No Events Found</h4>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              {activeFilter === 'all'
                ? 'No backlink events have been detected yet. Run a scan to establish or update your baseline.'
                : `No events match the "${activeFilter.replace('_', ' ')}" filter.`}
            </p>
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className={`p-4 sm:p-5 transition-colors hover:bg-white/[0.015] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                !evt.isRead ? 'bg-emerald-500/[0.02]' : ''
              }`}
            >
              {/* Left Column: Event details */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {!evt.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
                  )}
                  {getEventBadge(evt.eventType)}
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-text-muted" />
                    {formatTimestamp(evt.detectedAt)}
                  </span>
                  {evt.linkType && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.04] text-text-muted border border-white/[0.06]">
                      {evt.linkType}
                    </span>
                  )}
                </div>

                {/* Source & Target links */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-text-primary font-medium truncate">
                    <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="text-text-muted">Source:</span>
                    <a
                      href={evt.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 underline decoration-white/[0.2] hover:decoration-emerald-400 truncate flex items-center gap-1"
                    >
                      <span className="truncate">{evt.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 text-text-muted truncate">
                    <span className="text-text-muted shrink-0 pl-5">Target:</span>
                    <span className="text-text-secondary truncate">{evt.targetUrl}</span>
                  </div>
                </div>

                {/* Anchor Text / Diff preview */}
                {evt.eventType === 'backlink_changed' && evt.previousValues ? (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1">
                    <div className="text-[11px] text-text-muted font-medium">Changes detected:</div>
                    {evt.previousValues.anchorText !== evt.newValues?.anchorText && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-text-muted">Anchor:</span>
                        <span className="line-through text-rose-400/80">
                          "{evt.previousValues.anchorText || '(empty)'}"
                        </span>
                        <span className="text-text-muted">→</span>
                        <span className="text-emerald-400 font-semibold">
                          "{evt.newValues?.anchorText || '(empty)'}"
                        </span>
                      </div>
                    )}
                    {evt.previousValues.linkType !== evt.newValues?.linkType && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-text-muted">Type:</span>
                        <span className="line-through text-rose-400/80">
                          {evt.previousValues.linkType}
                        </span>
                        <span className="text-text-muted">→</span>
                        <span className="text-emerald-400 font-semibold">
                          {evt.newValues?.linkType}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  evt.anchorText && (
                    <div className="text-xs text-text-muted pl-5">
                      Anchor text:{' '}
                      <span className="text-text-secondary font-medium italic">
                        "{evt.anchorText}"
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                {!evt.isRead && (
                  <button
                    onClick={() => onMarkRead(evt.id)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-emerald-400 transition-colors text-xs flex items-center gap-1"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Mark read</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted bg-[#101419]">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
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

export default MonitoringEventsList;
