import React from 'react';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

export const WebsiteStatusBadge = ({ status, className = '' }) => {
  const isVerified = status === 'verified';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${
        isVerified
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
      } ${className}`}
    >
      {isVerified ? (
        <>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified</span>
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Verification</span>
        </>
      )}
    </span>
  );
};
