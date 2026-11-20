import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { useDashboard } from '../context/DashboardContext';
import { ToastContainer } from '../components/common/Toast';
import { SearchModal } from '../components/common/SearchModal';
import { NewCampaignModal } from '../components/dashboard/NewCampaignModal';
import { AlertDetailModal } from '../components/common/AlertDetailModal';

export const MainLayout = () => {
  const {
    sidebarCollapsed,
    searchModalOpen,
    setSearchModalOpen,
    newCampaignModalOpen,
    setNewCampaignModalOpen,
    selectedAlertModal,
    setSelectedAlertModal
  } = useDashboard();

  return (
    <div className="min-h-screen bg-[#0B0D10] text-text-primary flex">
      {/* Toast Notification Mount */}
      <ToastContainer />

      {/* Global Command / Search Palette */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* New Campaign Dialog Modal */}
      <NewCampaignModal
        isOpen={newCampaignModalOpen}
        onClose={() => setNewCampaignModalOpen(false)}
      />

      {/* Actionable Alert Detail Modal */}
      <AlertDetailModal
        isOpen={!!selectedAlertModal}
        alert={selectedAlertModal}
        onClose={() => setSelectedAlertModal(null)}
      />

      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <TopHeader />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-white/[0.04] py-4 px-6 text-center text-xs text-text-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-secondary">LINKORA</span>
            <span>• SEO Automation & Backlink Intelligence</span>
          </div>
          <div className="text-[11px] text-text-muted">
            Prototype v1.0 • All data simulated for demonstration
          </div>
        </footer>
      </div>
    </div>
  );
};
