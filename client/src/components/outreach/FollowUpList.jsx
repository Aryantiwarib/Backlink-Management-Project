import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  Send,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { outreachApi } from '../../api/outreachService';
import { useToast } from '../../context/ToastContext';

export const FollowUpList = ({
  websiteId,
  campaignId,
  templates = [],
  onOpenComposer,
  refreshTrigger = 0
}) => {
  const { showToast } = useToast();

  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [tabFilter, setTabFilter] = useState('all'); // 'all', 'overdue', 'upcoming'

  const fetchFollowUps = useCallback(async () => {
    if (!websiteId || !campaignId) return;
    try {
      setLoading(true);
      setError('');
      const data = await outreachApi.listFollowUps(websiteId, campaignId);
      setUpcoming(data.upcoming || []);
      setOverdue(data.overdue || []);
    } catch (err) {
      setError(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [websiteId, campaignId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps, refreshTrigger]);

  const handleCancel = async (followUpId, prospectDomain) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled follow-up for ${prospectDomain}?`)) {
      return;
    }

    try {
      setCancellingId(followUpId);
      await outreachApi.cancelFollowUp(websiteId, campaignId, followUpId);
      showToast(`Follow-up for ${prospectDomain} cancelled.`);
      fetchFollowUps();
    } catch (err) {
      showToast(err.message || 'Failed to cancel follow-up', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const allItems = [
    ...overdue.map((item) => ({ ...item, isOverdue: true })),
    ...upcoming.map((item) => ({ ...item, isOverdue: false }))
  ];

  const displayedItems = allItems.filter((item) => {
    if (tabFilter === 'overdue') return item.isOverdue;
    if (tabFilter === 'upcoming') return !item.isOverdue;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#15191E] border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Scheduled Follow-ups</h3>
            <p className="text-xs text-slate-400">
              {overdue.length} overdue &bull; {upcoming.length} upcoming
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                tabFilter === 'all'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({allItems.length})
            </button>
            <button
              onClick={() => setTabFilter('overdue')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                tabFilter === 'overdue'
                  ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overdue ({overdue.length})
            </button>
            <button
              onClick={() => setTabFilter('upcoming')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                tabFilter === 'upcoming'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
          </div>

          <button
            onClick={fetchFollowUps}
            title="Refresh follow-ups"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && allItems.length === 0 ? (
        <div className="bg-[#15191E] border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
          Loading scheduled follow-ups...
        </div>
      ) : displayedItems.length === 0 ? (
        /* Empty State */
        <div className="bg-[#15191E] border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-200">No follow-ups found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {tabFilter === 'all'
              ? 'There are no pending follow-ups scheduled for this campaign. You can schedule follow-ups directly from your prospect list.'
              : `There are no ${tabFilter} follow-ups at this time.`}
          </p>
        </div>
      ) : (
        /* Follow-ups List */
        <div className="space-y-2.5">
          {displayedItems.map((item) => {
            const domain = item.prospect?.prospectDomain || 'Unknown Domain';
            const email = item.prospect?.contactEmail || 'No email';
            const scheduledDate = new Date(item.scheduledDate);
            const isOverdue = item.isOverdue;

            return (
              <div
                key={item._id}
                className={`p-4 bg-[#15191E] border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isOverdue ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-200 truncate">{domain}</span>
                    {isOverdue ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3 mr-0.5" /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Clock className="w-3 h-3 mr-0.5" /> Upcoming
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{email}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className={isOverdue ? 'text-rose-400 font-medium' : 'text-slate-300'}>
                        {scheduledDate.toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1.5 rounded-lg italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                  {onOpenComposer && (
                    <button
                      onClick={() => onOpenComposer(item)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Follow-up</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCancel(item._id, domain)}
                    disabled={cancellingId === item._id}
                    className="p-1.5 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-colors"
                    title="Cancel Follow-up"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FollowUpList;