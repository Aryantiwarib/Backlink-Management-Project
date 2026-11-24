import React from 'react';
import {
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Award,
  Compass
} from 'lucide-react';

export const ProspectingSummaryCards = ({ stats, loading }) => {
  const byStatus = stats?.byStatus || {};
  const totalSaved = stats?.totalSaved || 0;
  const qualified = byStatus.qualified || 0;
  const reviewed = byStatus.reviewed || 0;
  const saved = byStatus.saved || 0;
  const avgDA = stats?.avgDA;
  const avgScore = stats?.avgScore;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Saved Pipeline */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Prospect Pipeline</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-text-primary">
              {loading ? '—' : totalSaved}
            </span>
            <span className="text-xs text-text-muted ml-2">saved opportunities</span>
          </div>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        </div>
      </div>

      {/* 2. Qualified Candidates */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Qualified Prospects</span>
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-blue-400">
              {loading ? '—' : qualified}
            </span>
            <span className="text-xs text-text-muted ml-2">ready for outreach</span>
          </div>
          <span className="text-xs text-text-muted">
            {totalSaved > 0 ? `${Math.round((qualified / totalSaved) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* 3. Under Review / New */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Under Evaluation</span>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-amber-400">
              {loading ? '—' : saved + reviewed}
            </span>
            <span className="text-xs text-text-muted ml-2">pending review</span>
          </div>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pipeline
          </span>
        </div>
      </div>

      {/* 4. Average Opportunity Quality */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">Average Authority</span>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-purple-400">
              {loading ? '—' : avgDA ? `DA ${avgDA}` : 'N/A'}
            </span>
            <span className="text-xs text-text-muted ml-2">
              {avgScore ? `Avg Score: ${avgScore}/100` : ''}
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Moz API
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProspectingSummaryCards;
