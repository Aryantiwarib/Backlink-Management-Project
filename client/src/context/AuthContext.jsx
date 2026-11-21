import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current session on mount and after actions
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authService.getMe();
      if (res && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 means not authenticated; perfectly normal when not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Clean up ?oauth=success and hash fragments from URL if present
    if (typeof window !== 'undefined' && window.location.search.includes('oauth=success')) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authService.login({ email, password });
      if (res && res.data) {
        setUser(res.data);
        return { success: true, user: res.data };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      const message = err.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, message };
    }
  };

  // Signup handler
  const signup = async (userData) => {
    setError(null);
    try {
      const res = await authService.signup(userData);
      if (res && res.data) {
        setUser(res.data);
        return { success: true, user: res.data };
      }
      return { success: false, message: 'Account creation failed' };
    } catch (err) {
      const message = err.data?.message || err.message || 'Signup failed. Please try again.';
      setError(message);
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        error,
        setError,
        login,
        signup,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
