import React from 'react';
import { Sparkles, Mail } from 'lucide-react';

/**
 * Floating Circular/Pill Action Button for Bulk Email Generation
 * Displayed in visible viewport area when 1 or more prospects are selected.
 */
export const FloatingGenerateMailButton = ({
  selectedCount = 0,
  onClick,
  disabled = false,
  className = ''
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${className}`}
      style={{ maxWidth: 'calc(100vw - 3rem)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={`Generate personalized outreach email for ${selectedCount} selected prospect${selectedCount === 1 ? '' : 's'}`}
        className="group relative flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        {/* Glow halo */}
        <span className="absolute -inset-1 rounded-full bg-emerald-400/20 blur-sm group-hover:bg-emerald-400/35 transition-all -z-10" />

        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-4 h-4 text-black animate-pulse" />
          <Mail className="w-3.5 h-3.5 text-black hidden sm:inline" />
        </div>

        <span className="tracking-tight whitespace-nowrap">Generate Mail</span>

        {/* Selected count pill */}
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-black text-emerald-400 text-[11px] font-extrabold font-mono shadow-inner">
          {selectedCount}
        </span>
      </button>
    </div>
  );
};

export default FloatingGenerateMailButton;
