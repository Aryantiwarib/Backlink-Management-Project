import React from 'react';
import { AlertTriangle, AlertCircle, Info, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export const ActionableAlerts = () => {
  const { alerts, setSelectedAlertModal } = useDashboard();

  const getAlertStyles = (severity) => {
    switch (severity) {
      case 'error':
        return {
          icon: AlertCircle,
          badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          cardBorder: 'border-rose-500/20 hover:border-rose-500/40',
          btnClass: 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
          btnClass: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
        };
      case 'info':
      default:
        return {
          icon: Info,
          badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          cardBorder: 'border-blue-500/20 hover:border-blue-500/40',
          btnClass: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/30'
        };
    }
  };

  return (
    <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Needs Attention
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {alerts.length} Action Items
            </span>
          </div>
          <ShieldAlert className="w-4 h-4 text-text-muted" />
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getAlertStyles(alert.severity);
            const Icon = styles.icon;

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl bg-white/[0.02] border transition-all ${styles.cardBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 mt-0.5 ${styles.badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">
                      {alert.title}
                    </h3>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                      {alert.description}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedAlertModal(alert)}
                  className={`self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-shrink-0 ${styles.btnClass}`}
                >
                  <span>{alert.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 mt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Automated link health scans running every 15 min
        </span>
      </div>
    </div>
  );
};
