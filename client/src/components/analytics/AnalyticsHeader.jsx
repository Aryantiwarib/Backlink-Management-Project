import React, { useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  RefreshCw,
  Globe,
  SlidersHorizontal,
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
    <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-20 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Title & Active Website Selector */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Reports & Analytics</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive growth trends, campaign impact, and executive SEO reporting
            </p>
          </div>

          {/* Website Dropdown */}
          <div className="relative">
            <button
              onClick={() => setWebsiteDropdownOpen(!websiteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-sm text-slate-200 transition"
              title="Switch Active Website"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium max-w-[140px] truncate">
                {activeWebsite?.domain || 'Select Website'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {websiteDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-medium truncate">{w.domain}</div>
                        <div className="text-[10px] text-slate-500 truncate">{w.name}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
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
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/80 text-xs">
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
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
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
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Reload analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
            title="Export full analytics as CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Executive Report Button */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Select Custom Date Range
              </h3>
              <button
                onClick={() => setCustomModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setCustomModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustom}
                disabled={!tempStart || !tempEnd}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
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
