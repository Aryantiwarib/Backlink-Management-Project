import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-white/[0.05] rounded-lg ${className}`} />
  );
};

export const KpiCardSkeleton = () => {
  return (
    <div className="surface-card rounded-xl p-5 flex flex-col justify-between h-[148px]">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-8 w-36 mb-2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
};

export const ChartSkeleton = () => {
  return (
    <div className="surface-card rounded-xl p-6 h-[380px] flex flex-col justify-between">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-6 w-44 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-[250px] w-full rounded-lg" />
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.04]">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
};
