import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Mail } from 'lucide-react';

/**
 * Floating Circular/Pill Action Button for Bulk Email Generation
 * Displayed in visible viewport area when 1 or more prospects are selected.
 * Uses createPortal to mount directly to document.body so it is never trapped
 * by overflow-hidden, transform, or stacking contexts in ancestor components.
 */
export const FloatingGenerateMailButton = ({
  selectedCount = 0,
  onClick,
  disabled = false,
  className = ''
}) => {
  if (selectedCount <= 0) return null;

  const buttonElement = (
    <div
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center pointer-events-auto ${className}`}
      style={{ maxWidth: 'calc(100vw - 3rem)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        id="floating-generate-mail-btn"
        title={`Generate personalized outreach email for ${selectedCount} selected prospect${selectedCount === 1 ? '' : 's'}`}
        className="group relative flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs sm:text-sm shadow-2xl shadow-emerald-500/35 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        {/* Glow halo */}
        <span className="absolute -inset-1 rounded-full bg-emerald-400/25 blur-md group-hover:bg-emerald-400/40 transition-all -z-10" />

        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-4 h-4 text-black animate-pulse" />
          <Mail className="w-3.5 h-3.5 text-black hidden sm:inline" />
        </div>

        <span className="tracking-tight whitespace-nowrap">
          Generate Mail ({selectedCount})
        </span>
      </button>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(buttonElement, document.body);
  }

  return buttonElement;
};

export default FloatingGenerateMailButton;
