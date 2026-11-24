import React, { useState } from 'react';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointer,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  RotateCw
} from 'lucide-react';

export const OutreachQueueTable = ({
  emails = [],
  loading = false,
  statusFilter = 'all',
  onStatusFilterChange,
  onRefresh
}) => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            Sending
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-text-muted">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#15191E] border border-white/[0.08] text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-black/40 rounded-xl border border-white/[0.06]">
          {['all', 'pending', 'processing', 'sent', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => onStatusFilterChange(st)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-text-muted text-xs">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
            <span>Loading outreach email activity...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs space-y-1">
            <Mail className="w-8 h-8 mx-auto text-text-muted opacity-40 mb-2" />
            <p className="font-semibold text-text-secondary">No Emails in This View</p>
            <p className="text-[11px] text-text-muted">
              Select assigned prospects and click "Send Outreach" to queue your first email batch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
                  <th className="py-3 px-4 font-medium">Recipient</th>
                  <th className="py-3 px-4 font-medium">Subject</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Engagement</th>
                  <th className="py-3 px-4 font-medium">Sent Date</th>
                  <th className="py-3 px-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {emails.map((e) => {
                  const isExpanded = expandedId === e.id;
                  return (
                    <React.Fragment key={e.id}>
                      <tr
                        onClick={() => toggleExpand(e.id)}
                        className="hover:bg-white/[0.015] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-text-primary block truncate max-w-[180px]">
                            {e.recipientEmail}
                          </span>
                          {e.recipientName && (
                            <span className="text-[10px] text-text-muted block truncate">
                              {e.recipientName}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-text-secondary">
                          {e.subject}
                        </td>

                        <td className="py-3.5 px-4">{getStatusBadge(e.status)}</td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 text-[11px]">
                            <span
                              className={`flex items-center gap-1 ${
                                e.openCount > 0 ? 'text-blue-400 font-semibold' : 'text-text-muted'
                              }`}
                              title={`${e.openCount} opens`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {e.openCount}
                            </span>

                            <span
                              className={`flex items-center gap-1 ${
                                e.clickCount > 0 ? 'text-teal-400 font-semibold' : 'text-text-muted'
                              }`}
                              title={`${e.clickCount} clicks`}
                            >
                              <MousePointer className="w-3.5 h-3.5" />
                              {e.clickCount}
                            </span>

                            {e.repliedAt && (
                              <span
                                className="flex items-center gap-1 text-emerald-400 font-semibold"
                                title="Prospect replied!"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Replied
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                          {e.sentAt
                            ? new Date(e.sentAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : e.status === 'pending'
                            ? `Scheduled ${new Date(e.scheduledFor).toLocaleDateString()}`
                            : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right text-text-muted">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable row: email body preview and error messages */}
                      {isExpanded && (
                        <tr className="bg-black/30 border-b border-white/[0.04]">
                          <td colSpan={6} className="p-4 space-y-3">
                            {e.status === 'failed' && e.errorMessage && (
                              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                <strong>Failure Reason:</strong> {e.errorMessage}
                              </div>
                            )}

                            <div className="p-4 rounded-xl bg-[#15191E] border border-white/[0.06] text-xs space-y-2">
                              <div className="text-text-muted text-[11px] pb-2 border-b border-white/[0.04]">
                                <strong>Message ID:</strong> {e.gmailMessageId || 'Pending dispatch'}
                              </div>
                              <div className="whitespace-pre-line text-text-secondary leading-relaxed pt-1">
                                {e.bodyHtml?.replace(/<[^>]+>/g, ' ') || e.bodyText}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutreachQueueTable;
