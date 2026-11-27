import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Link2,
  Target,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Wrench,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Check,
  Sparkles,
  User,
  LogOut,
  X,
  Plus,
  Rocket,
  Mail,
  BarChart3
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import { useWebsite } from '../context/WebsiteContext';

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    selectedWebsite,
    setSelectedWebsite,
    linkAttributesSummary
  } = useDashboard();
  const { websites, activeWebsite, switchActiveWebsite } = useWebsite();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AM';

  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);

  const currentDisplayDomain = activeWebsite ? activeWebsite.domain : selectedWebsite;

  const totalSavedBacklinks = linkAttributesSummary?.total;

  const navGroups = [
    {
      group: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Websites', path: '/websites', icon: Globe, badge: websites.length ? `${websites.length}` : undefined },
        { label: 'AI Assistant', path: '/assistant', icon: Sparkles, badge: 'AI' }
      ]
    },
    {
      group: 'LINK BUILDING',
      items: [
        {
          label: 'Backlinks',
          path: '/backlinks',
          icon: Link2,
          badge: totalSavedBacklinks ? `${totalSavedBacklinks}` : undefined
        },
        { label: 'Link Prospecting', path: '/link-acquisition', icon: Target },
        { label: 'Campaigns', path: '/campaigns', icon: Rocket },
        { label: 'Outreach & Emails', path: '/outreach', icon: Mail },
        { label: 'Marketplace', path: '/marketplace', icon: ShoppingBag, badge: 'New' }
      ]
    },
    {
      group: 'CONTENT',
      items: [
        { label: 'Content Planner', path: '/content-planner', icon: FileText }
      ]
    },
    {
      group: 'ANALYTICS',
      items: [
        { label: 'Reports & Analytics', path: '/analytics', icon: BarChart3 },
        { label: 'Backlink Monitoring', path: '/monitoring', icon: ShieldCheck },
        { label: 'SEO Tools', path: '/seo-tools', icon: Wrench, badge: 'Live API' }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  const handleLinkClick = () => {
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#101318] border-r border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-glow-brand">
              <Link2 className="w-5 h-5 text-black stroke-[2.5]" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wider text-text-primary">
                  LINK<span className="text-emerald-400">ORA</span>
                </span>
                <span className="text-[10px] text-text-muted font-mono tracking-tight">
                  SEO & Backlinks
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Domain / Workspace Switcher */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3 pb-1 flex-shrink-0 relative">
            <button
              onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#15191E] border border-white/[0.07] hover:border-white/[0.12] transition-colors group text-left"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {currentDisplayDomain}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    Active Workspace
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {domainDropdownOpen && (
              <div className="absolute left-3 right-3 top-16 mt-1 bg-[#15191E] border border-white/[0.1] rounded-xl shadow-elevated p-1.5 z-50 space-y-1">
                {websites.length > 0 ? (
                  websites.map((w) => {
                    const isSelected = (activeWebsite?.id === w.id || activeWebsite?._id === w.id) || currentDisplayDomain === w.domain;
                    return (
                      <button
                        key={w.id || w._id}
                        onClick={() => {
                          switchActiveWebsite(w.id || w._id);
                          setSelectedWebsite(w.domain);
                          setDomainDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                            : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              w.verificationStatus === 'verified' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            title={w.verificationStatus === 'verified' ? 'DNS Verified' : 'Verification Pending'}
                          />
                          <div className="truncate">
                            <div className="font-mono text-xs truncate">{w.domain}</div>
                            <div className="text-[10px] text-text-muted truncate">{w.name}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-text-muted text-center">
                    No websites added yet
                  </div>
                )}

                <NavLink
                  to="/websites"
                  onClick={() => setDomainDropdownOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 p-2 mt-1 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-white/[0.04]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Websites</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="px-3 text-[10px] font-bold text-text-muted tracking-wider uppercase">
                  {group.group}
                </div>
              ) : (
                <div className="h-2" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-400'
                          : 'text-text-muted group-hover:text-text-primary'
                      }`}
                    />

                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${
                              item.badge === 'New'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/[0.06] text-text-muted'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Profile and Collapse Control at Bottom */}
        <div className="p-3 border-t border-white/[0.06] bg-[#0E1115] flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                  {userInitials}
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {user?.name || 'Alex Morgan'}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono truncate">
                    {user?.email || 'alex@growthlabs.io'}
                  </div>
                </div>
              )}
            </div>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
