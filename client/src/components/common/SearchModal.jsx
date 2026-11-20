import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, FileText, ArrowRight, ExternalLink, Sparkles, X, PlusCircle } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { openNewCampaignModal } = useDashboard();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickNavItems = [
    { label: 'Dashboard Overview', path: '/', category: 'Navigation', icon: Globe },
    { label: 'Backlink Monitor & Index', path: '/backlinks', category: 'Navigation', icon: ExternalLink },
    { label: 'Link Acquisition Campaigns', path: '/link-acquisition', category: 'Navigation', icon: Sparkles },
    { label: 'Backlink Marketplace', path: '/marketplace', category: 'Navigation', icon: Globe },
    { label: 'Content Planner & Articles', path: '/content-planner', category: 'Navigation', icon: FileText },
    { label: 'Backlink Audit & Toxicity', path: '/backlink-audit', category: 'Navigation', icon: Globe },
    { label: 'SEO Analysis Tools', path: '/seo-tools', category: 'Navigation', icon: Globe }
  ];

  const filteredItems = quickNavItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  const handleNewCampaign = () => {
    onClose();
    openNewCampaignModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Search Palette */}
      <div className="relative w-full max-w-xl bg-[#15191E] border border-white/[0.1] rounded-2xl shadow-elevated overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-[#12151A]">
          <Search className="w-5 h-5 text-text-muted mr-3" />
          <input
            type="text"
            placeholder="Search modules, backlinks, campaigns, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono text-text-muted bg-white/[0.06] border border-white/[0.08] rounded">ESC</kbd>
        </div>

        {/* Quick actions row */}
        <div className="p-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-text-muted text-[11px] uppercase tracking-wider px-2">Quick Actions:</span>
          <button
            onClick={handleNewCampaign}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + New Campaign
          </button>
        </div>

        {/* Results */}
        <div className="p-2 max-h-80 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              No matching pages or commands found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Modules & Views
              </div>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-white/[0.05] text-text-muted group-hover:text-emerald-400 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-text-primary">{item.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-[#101318] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-text-muted">
          <span>Navigate with arrows or click</span>
          <span>LINKORA v1.0</span>
        </div>
      </div>
    </div>
  );
};
