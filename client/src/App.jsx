import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { WebsiteProvider } from './context/WebsiteContext';
import { DashboardProvider } from './context/DashboardContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { WebsiteManagementPage } from './pages/WebsiteManagementPage';
import { BacklinkExplorerPage } from './pages/BacklinkExplorerPage';
import { BacklinkMonitoringPage } from './pages/BacklinkMonitoringPage';
import { LinkProspectingPage } from './pages/LinkProspectingPage';
import { CampaignManagementPage } from './pages/CampaignManagementPage';
import { CampaignDetailsPage } from './pages/CampaignDetailsPage';
import { OutreachEmailPage } from './pages/OutreachEmailPage';
import { SeoToolsPage } from './pages/SeoToolsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <WebsiteProvider>
              <DashboardProvider>
                <BrowserRouter>
                <Routes>
                  {/* Public Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Protected Workspace Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<MainLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="websites" element={<WebsiteManagementPage />} />
                      <Route path="backlinks" element={<BacklinkExplorerPage />} />
                      <Route path="link-acquisition" element={<LinkProspectingPage />} />
                      <Route path="prospecting" element={<LinkProspectingPage />} />
                      <Route path="campaigns" element={<CampaignManagementPage />} />
                      <Route path="campaigns/:campaignId" element={<CampaignDetailsPage />} />
                      <Route path="outreach" element={<OutreachEmailPage />} />
                      <Route path="email-outreach" element={<OutreachEmailPage />} />
                      <Route path="marketplace" element={<ComingSoonPage />} />
                      <Route path="content-planner" element={<ComingSoonPage />} />
                      <Route path="backlink-audit" element={<BacklinkMonitoringPage />} />
                      <Route path="monitoring" element={<BacklinkMonitoringPage />} />
                      <Route path="seo-tools" element={<SeoToolsPage />} />
                      <Route path="assistant" element={<AiAssistantPage />} />
                      <Route path="ai-assistant" element={<AiAssistantPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="reports" element={<AnalyticsPage />} />
                      <Route path="settings" element={<ComingSoonPage />} />
                    </Route>
                  </Route>

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </DashboardProvider>
          </WebsiteProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);
}

export default App;
