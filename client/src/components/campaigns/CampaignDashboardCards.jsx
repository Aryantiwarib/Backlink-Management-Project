import React from 'react';
import {
  Rocket,
  CheckCircle2,
  Clock,
  Archive,
  Target,
  Link2,
  Layers,
  PauseCircle
} from 'lucide-react';

export const CampaignDashboardCards = ({ stats, loading }) => {
  const totalCampaigns = stats?.totalCampaigns ?? 0;
  const activeCampaigns = stats?.activeCampaigns ?? 0;
  const draftCampaigns = stats?.draftCampaigns ?? 0;
  const pausedCampaigns = stats?.pausedCampaigns ?? 0;
  const completedCampaigns = stats?.completedCampaigns ?? 0;
  const totalAssigned = stats?.totalAssignedProspects ?? 0;
  const totalAcquired = stats?.totalAcquiredBacklinks ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Campaigns */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Total Campaigns</span>
          <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-text-primary">
            {loading ? '—' : totalCampaigns}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">all stages</span>
        </div>
      </div>

      {/* 2. Active Campaigns */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Active</span>
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Rocket className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-emerald-400">
            {loading ? '—' : activeCampaigns}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">live outreach</span>
        </div>
      </div>

      {/* 3. Draft / In-Prep */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Drafts</span>
          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-amber-400">
            {loading ? '—' : draftCampaigns}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">configuring</span>
        </div>
      </div>

      {/* 4. Completed */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Completed</span>
          <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-blue-400">
            {loading ? '—' : completedCampaigns}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">goals achieved</span>
        </div>
      </div>

      {/* 5. Assigned Prospects */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Assigned Targets</span>
          <div className="p-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-teal-400">
            {loading ? '—' : totalAssigned}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">Phase 9 prospects</span>
        </div>
      </div>

      {/* 6. Acquired Backlinks */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">Acquired Links</span>
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Link2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold text-emerald-400">
            {loading ? '—' : totalAcquired}
          </span>
          <span className="text-[10px] text-text-muted block mt-0.5">secured backlinks</span>
        </div>
      </div>
    </div>
  );
};

export default CampaignDashboardCards;
