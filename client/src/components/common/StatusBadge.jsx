import React from 'react';

export const StatusBadge = ({ status, size = 'sm' }) => {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  let styles = 'bg-white/5 text-text-secondary border-white/10';
  let dotColor = 'bg-gray-400';

  if (normalized === 'active' || normalized === 'published' || normalized === 'success') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    dotColor = 'bg-emerald-400';
  } else if (normalized === 'new' || normalized === 'info') {
    styles = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    dotColor = 'bg-blue-400';
  } else if (normalized === 'in review' || normalized === 'in progress' || normalized === 'pending' || normalized === 'warning') {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dotColor = 'bg-amber-400';
  } else if (normalized === 'lost' || normalized === 'failed' || normalized === 'error') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    dotColor = 'bg-rose-400';
  }

  const sizeClasses = size === 'xs' 
    ? 'text-[11px] px-2 py-0.5' 
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};
