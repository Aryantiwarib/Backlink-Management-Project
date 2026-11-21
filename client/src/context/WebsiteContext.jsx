import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { websiteService } from '../api/websiteService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WebsiteContext = createContext(null);

export const WebsiteProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();

  const [websites, setWebsites] = useState([]);
  const [activeWebsite, setActiveWebsite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch websites for logged in user
  const fetchWebsites = useCallback(async () => {
    if (!isAuthenticated) {
      setWebsites([]);
      setActiveWebsite(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await websiteService.getWebsites();
      if (res && res.data) {
        setWebsites(res.data);
        const active = res.data.find((w) => w.isActive) || res.data[0] || null;
        setActiveWebsite(active);
      }
    } catch (err) {
      console.warn('Failed to fetch websites:', err.message);
      setError(err.message || 'Failed to load websites.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites, user]);

  // Add website
  const addWebsite = async (formData) => {
    try {
      const res = await websiteService.createWebsite(formData);
      if (res && res.data) {
        addToast(`Website "${res.data.domain}" added successfully!`, 'success');
        await fetchWebsites();
        return { success: true, data: res.data };
      }
      return { success: false, message: 'Invalid response from server.' };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to add website.';
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Update website
  const updateWebsite = async (id, updateData) => {
    try {
      const res = await websiteService.updateWebsite(id, updateData);
      if (res && res.data) {
        addToast(`Website details updated successfully.`, 'success');
        await fetchWebsites();
        return { success: true, data: res.data };
      }
      return { success: false, message: 'Invalid response from server.' };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to update website.';
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Delete website
  const deleteWebsite = async (id) => {
    try {
      const res = await websiteService.deleteWebsite(id);
      addToast(res.message || 'Website deleted.', 'info');
      await fetchWebsites();
      return { success: true };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to delete website.';
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Switch active website
  const switchActiveWebsite = async (id) => {
    try {
      const res = await websiteService.setActiveWebsite(id);
      if (res && res.data) {
        setActiveWebsite(res.data);
        setWebsites((prev) =>
          prev.map((w) => ({
            ...w,
            isActive: w.id === id || w._id === id
          }))
        );
        addToast(`Active workspace switched to "${res.data.domain}".`, 'success');
        return { success: true, data: res.data };
      }
      return { success: false, message: 'Failed to switch website.' };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to switch active website.';
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Verify domain ownership
  const verifyDomain = async (id) => {
    try {
      const res = await websiteService.verifyDomain(id);
      if (res && res.success) {
        addToast(res.message || 'Domain verified successfully!', 'success');
        await fetchWebsites();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message, details: res.details };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Verification failed.';
      return {
        success: false,
        message: msg,
        details: err.data?.details
      };
    }
  };

  // Fetch single website with DNS instructions
  const getWebsiteDetails = async (id) => {
    try {
      const res = await websiteService.getWebsite(id);
      return res.data;
    } catch (err) {
      console.error('Failed to get website details:', err);
      throw err;
    }
  };

  return (
    <WebsiteContext.Provider
      value={{
        websites,
        activeWebsite,
        loading,
        error,
        fetchWebsites,
        addWebsite,
        updateWebsite,
        deleteWebsite,
        switchActiveWebsite,
        verifyDomain,
        getWebsiteDetails
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
};

export const useWebsite = () => {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error('useWebsite must be used within a WebsiteProvider');
  }
  return context;
};
