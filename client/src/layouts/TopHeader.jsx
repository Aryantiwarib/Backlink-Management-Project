import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Globe,
  Calendar,
  ChevronDown,
  Check,
  User,
  Shield,
  HelpCircle,
  LogOut,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export const TopHeader = () => {
  const location = useLocation();
  const {
    sidebarCollapsed,
    setMobileSidebarOpen,
    selectedWebsite,
    setSelectedWebsite,
    dateRange,
    setDateRange,
    setSearchModalOpen,
    alerts
  } = useDashboard();

  const [websiteDropdownOpen, setWebsiteDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Websites list
  const websites = [
    { id: 'growthlabs.io', label: 'growthlabs.io', category: 'Production' },
    { id: 'saasmetrics.co', label: 'saasmetrics.co', category: 'Staging' },
    { id: 'fintechpulse.com', label: 'fintechpulse.com', category: 'Partner' }
  ];

  // Date ranges
  const dateRanges = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'this_month', label: 'This month' }
  ];

  // Map route to breadcrumb title
  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/':
        return { section: 'Overview', page: 'Dashboard' };
      case '/backlinks':
        return { section: 'Link Building', page: 'Backlinks' };
      case '/link-acquisition':
        return { section: 'Link Building', page: 'Link Acquisition' };
      case '/marketplace':
        return { section: 'Link Building', page: 'Marketplace' };
      case '/content-planner':
        return { section: 'Content', page: 'Content Planner' };
      case '/backlink-audit':
        return { section: 'Analytics', page: 'Backlink Audit' };
      case '/seo-tools':
        return { section: 'Analytics', page: 'SEO Tools' };
      case '/settings':
        return { section: 'System', page: 'Settings' };
      default:
        return { section: 'Overview', page: 'Dashboard' };
    }
  };

  const breadcrumb = getBreadcrumb();
  const selectedDateLabel = dateRanges.find((r) => r.id === dateRange)?.label || 'Last 30 days';

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B0D10]/85 backdrop-blur-md border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-text-muted hidden sm:inline">{breadcrumb.section}</span>
          <span className="text-text-muted/50 hidden sm:inline">/</span>
          <span className="font-semibold text-text-primary">{breadcrumb.page}</span>
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Website Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setWebsiteDropdownOpen(!websiteDropdownOpen);
              setDateDropdownOpen(false);
              setNotificationsOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.14] text-xs text-text-primary transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-medium max-w-[90px] sm:max-w-none truncate">
              {selectedWebsite}
            </span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {websiteDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#15191E] border border-white/[0.1] rounded-xl shadow-elevated p-1.5 z-50">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                Select Domain
              </div>
              {websites.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setSelectedWebsite(w.id);
                    setWebsiteDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    selectedWebsite === w.id
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                  }`}
                >
                  <div className="text-left font-mono">{w.label}</div>
                  {selectedWebsite === w.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDateDropdownOpen(!dateDropdownOpen);
              setWebsiteDropdownOpen(false);
              setNotificationsOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.14] text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden md:inline">{selectedDateLabel}</span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {dateDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[#15191E] border border-white/[0.1] rounded-xl shadow-elevated p-1.5 z-50">
              {dateRanges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setDateRange(r.id);
                    setDateDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    dateRange === r.id
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                  }`}
                >
                  <span>{r.label}</span>
                  {dateRange === r.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.14] text-xs text-text-muted hover:text-text-primary transition-colors"
          title="Search anything (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden lg:inline text-xs">Search...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-white/[0.05] border border-white/[0.08] rounded">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setWebsiteDropdownOpen(false);
              setDateDropdownOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="relative p-2 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.14] text-text-secondary hover:text-text-primary transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts && alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#15191E]" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#15191E] border border-white/[0.1] rounded-2xl shadow-elevated p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <span className="text-xs font-bold text-text-primary">Notifications</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {alerts?.length || 0} New
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts?.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs hover:border-white/[0.1] transition-colors cursor-pointer"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <div className="font-semibold text-text-primary line-clamp-1">{a.title}</div>
                    <div className="text-[11px] text-text-muted line-clamp-2 mt-0.5">{a.description}</div>
                  </div>
                ))}
              </div>
              <div className="pt-2 mt-2 border-t border-white/[0.06] text-center">
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] font-medium text-emerald-400 hover:underline"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setWebsiteDropdownOpen(false);
              setDateDropdownOpen(false);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.14] transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-[10px] font-bold text-black">
              AM
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-text-primary">Alex</span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#15191E] border border-white/[0.1] rounded-2xl shadow-elevated p-2 z-50">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <div className="text-xs font-bold text-text-primary">Alex Morgan</div>
                <div className="text-[10px] text-text-muted font-mono">alex@growthlabs.io</div>
              </div>
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
              >
                <User className="w-3.5 h-3.5" />
                <span>Account Profile</span>
              </button>
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>API Keys & Tokens</span>
              </button>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
