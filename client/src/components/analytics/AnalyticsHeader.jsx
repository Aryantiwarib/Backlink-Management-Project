import React, { useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  RefreshCw,
  Globe,
  ChevronDown,
  Check
} from 'lucide-react';
import { useWebsite } from '../../context/WebsiteContext';

const PRESET_RANGES = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: '6m', label: 'Last 6 Months' },
  { id: '12m', label: 'Last 12 Months' },
  { id: 'custom', label: 'Custom' }
];

export const AnalyticsHeader = ({
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  onRefresh,
  isRefreshing,
  onOpenReport,
  onExportCsv
}) => {
  const { websites, activeWebsite, switchActiveWebsite } = useWebsite();
  const [websiteDropdownOpen, setWebsiteDropdownOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStart || '');
  const [tempEnd, setTempEnd] = useState(customEnd || '');

  const handleApplyCustom = () => {
    if (tempStart) setCustomStart(tempStart);
    if (tempEnd) setCustomEnd(tempEnd);
    setDateRange('custom');
    setCustomModalOpen(false);
  };

  return (
    <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Title & Active Website Selector */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Reports & Analytics</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Live Data
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Comprehensive growth trends, campaign impact, and executive SEO reporting
            </p>
          </div>

          {/* Website Dropdown */}
          <div className="relative">
            <button
              onClick={() => setWebsiteDropdownOpen(!websiteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101318] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-xs text-text-primary transition-colors"
              title="Switch Active Website"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-medium max-w-[140px] truncate">
                {activeWebsite?.domain || 'Select Website'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>

            {websiteDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-[#15191E] border border-white/[0.1] rounded-2xl shadow-elevated p-1.5 z-50">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2 py-1">
                  Select Workspace Domain
                </div>
                {websites.map((w) => {
                  const isSelected = activeWebsite?._id === w._id;
                  return (
                    <button
                      key={w._id}
                      onClick={() => {
                        switchActiveWebsite(w._id);
                        setWebsiteDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30'
                          : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-mono text-xs truncate">{w.domain}</div>
                        <div className="text-[10px] text-text-muted truncate">{w.name}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Date Range Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Range Selector */}
          <div className="flex items-center bg-[#101318] rounded-xl p-1 border border-white/[0.06] text-xs">
            {PRESET_RANGES.map((preset) => {
              const active = dateRange === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (preset.id === 'custom') {
                      setCustomModalOpen(true);
                    } else {
                      setDateRange(preset.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-black shadow-glow-brand font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#101318] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            title="Reload analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#101318] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] text-xs font-semibold text-text-primary transition-colors"
            title="Export full analytics as CSV report"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export CSV</span>
          </button>

          {/* Executive Report Button */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-semibold shadow-glow-brand transition-all"
            title="Generate print-ready executive report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Report</span>
          </button>
        </div>
      </div>

      {/* Custom Date Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15191E] border border-white/[0.1] rounded-2xl w-full max-w-sm p-6 shadow-elevated">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Select Custom Date Range
              </h3>
              <button
                onClick={() => setCustomModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full bg-[#101318] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full bg-[#101318] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => setCustomModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustom}
                disabled={!tempStart || !tempEnd}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black disabled:opacity-50 transition-all shadow-glow-brand"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
