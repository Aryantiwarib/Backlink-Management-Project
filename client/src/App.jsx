import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { WebsiteProvider } from './context/WebsiteContext';
import { DashboardProvider } from './context/DashboardContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { WebsiteManagementPage } from './pages/WebsiteManagementPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
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
                    <Route path="backlinks" element={<ComingSoonPage />} />
                    <Route path="link-acquisition" element={<ComingSoonPage />} />
                    <Route path="marketplace" element={<ComingSoonPage />} />
                    <Route path="content-planner" element={<ComingSoonPage />} />
                    <Route path="backlink-audit" element={<ComingSoonPage />} />
                    <Route path="seo-tools" element={<ComingSoonPage />} />
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
  );
}

export default App;
