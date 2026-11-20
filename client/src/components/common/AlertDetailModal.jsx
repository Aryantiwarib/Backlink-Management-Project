import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, AlertCircle, Info, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export const AlertDetailModal = ({ alert, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  if (!alert) return null;

  let Icon = Info;
  let iconColor = 'text-blue-400';
  let badgeText = 'Notice';

  if (alert.severity === 'error') {
    Icon = AlertCircle;
    iconColor = 'text-rose-400';
    badgeText = 'High Priority';
  } else if (alert.severity === 'warning') {
    Icon = AlertTriangle;
    iconColor = 'text-amber-400';
    badgeText = 'Needs Attention';
  }

  const handleAction = () => {
    onClose();
    if (alert.targetRoute) {
      navigate(alert.targetRoute);
      addToast(`Navigated to ${alert.category.toUpperCase()} module to address issue`, 'info');
    }
  };

  const handleResolve = () => {
    onClose();
    addToast(`Issue marked as resolved: "${alert.title}"`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={alert.title}
      subtitle={alert.description}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Severity Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
          <div className="text-xs text-text-secondary flex-1">
            <span className="font-semibold text-text-primary capitalize">{badgeText}:</span>{' '}
            {alert.category === 'backlinks' && '3 high-authority domains removed or altered links.'}
            {alert.category === 'content' && 'Drafts are ready for editorial signoff before publication.'}
            {alert.category === 'system' && 'API integration errors require re-authentication or webhook retry.'}
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Impacted Items</h4>
          <div className="bg-[#111419] rounded-xl border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
            {alert.details && alert.details.map((item, idx) => (
              <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-mono text-text-primary truncate max-w-sm">
                  {item.domain || item.title || item.task}
                </div>
                <div className="flex items-center gap-2 text-text-muted text-[11px]">
                  {item.dr && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                      DR {item.dr}
                    </span>
                  )}
                  {item.author && <span>by {item.author}</span>}
                  {item.lostDate && <span>Lost on {item.lostDate}</span>}
                  {item.error && <span className="text-rose-400 font-mono text-[10px]">{item.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={handleResolve}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Resolved
          </button>
          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors shadow-glow-brand"
          >
            <span>{alert.actionLabel || 'Proceed to Module'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
