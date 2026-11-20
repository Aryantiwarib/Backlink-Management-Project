import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { DashboardProvider } from './context/DashboardContext';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ComingSoonPage } from './pages/ComingSoonPage';

function App() {
  return (
    <ToastProvider>
      <DashboardProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="backlinks" element={<ComingSoonPage />} />
              <Route path="link-acquisition" element={<ComingSoonPage />} />
              <Route path="marketplace" element={<ComingSoonPage />} />
              <Route path="content-planner" element={<ComingSoonPage />} />
              <Route path="backlink-audit" element={<ComingSoonPage />} />
              <Route path="seo-tools" element={<ComingSoonPage />} />
              <Route path="settings" element={<ComingSoonPage />} />
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DashboardProvider>
    </ToastProvider>
  );
}

export default App;
