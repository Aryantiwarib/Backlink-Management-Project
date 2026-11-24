import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const MonitoringControls = ({
  settings,
  onUpdateSettings,
  onTriggerScan,
  scanning,
  cooldownRemaining,
  updating
}) => {
  const [frequency, setFrequency] = useState(settings?.frequency || 'weekly');
  const [enabled, setEnabled] = useState(settings?.enabled || false);
  const [emailAlerts, setEmailAlerts] = useState(settings?.emailAlerts || false);

  useEffect(() => {
    if (settings) {
      setFrequency(settings.frequency || 'weekly');
      setEnabled(settings.enabled || false);
      setEmailAlerts(settings.emailAlerts || false);
    }
  }, [settings]);

  const handleToggleEnabled = async () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    await onUpdateSettings({ enabled: nextVal });
  };

  const handleFrequencyChange = async (e) => {
    const nextFreq = e.target.value;
    setFrequency(nextFreq);
    await onUpdateSettings({ frequency: nextFreq });
  };

  const handleToggleEmail = async () => {
    const nextVal = !emailAlerts;
    setEmailAlerts(nextVal);
    await onUpdateSettings({ emailAlerts: nextVal });
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Active Toggle & Cadence */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Toggle switch */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleEnabled}
            disabled={updating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              enabled ? 'bg-emerald-500' : 'bg-white/[0.12]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div>
            <span className="text-xs font-semibold text-text-primary block">
              Automated Monitoring
            </span>
            <span className="text-[11px] text-text-muted">
              {enabled ? 'Active periodic background scans' : 'Monitoring paused'}
            </span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-white/[0.08] hidden sm:block" />

        {/* Scan Frequency Selector */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Frequency:</span>
          <select
            value={frequency}
            onChange={handleFrequencyChange}
            disabled={updating || !enabled}
            className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (Recommended)</option>
            <option value="biweekly">Bi-weekly (14 days)</option>
            <option value="monthly">Monthly (30 days)</option>
          </select>
        </div>

        {/* Optional Email Notification Toggle */}
        <button
          type="button"
          onClick={handleToggleEmail}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition-colors ${
            emailAlerts
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 font-medium'
              : 'bg-white/[0.02] border-white/[0.08] text-text-muted hover:text-text-primary'
          }`}
          title="Toggle email notifications for critical backlink events"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Email Alerts: {emailAlerts ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right: Manual Scan CTA */}
      <div className="flex items-center gap-3">
        {cooldownRemaining > 0 && (
          <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            Cooldown: {cooldownRemaining}s
          </span>
        )}

        <button
          onClick={onTriggerScan}
          disabled={scanning || cooldownRemaining > 0}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
            scanning || cooldownRemaining > 0
              ? 'bg-white/[0.05] border border-white/[0.08] text-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning Backlinks...' : 'Scan Now'}</span>
        </button>
      </div>
    </div>
  );
};

export default MonitoringControls;
