import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const BacklinkSearchBar = ({ value = '', onChange, placeholder = 'Search by source URL, domain, landing page, or anchor text...' }) => {
  const [internalValue, setInternalValue] = useState(value);

  // Synchronize internal value when parent clears or updates
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounce notification to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange]);

  const handleClear = () => {
    setInternalValue('');
    onChange('');
  };

  return (
    <div className="relative flex-1 min-w-[240px]">
      <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 bg-[#101318] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans"
      />
      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
