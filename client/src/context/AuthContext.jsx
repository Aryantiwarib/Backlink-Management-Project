import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';
import { setAuthToken } from '../config/api';

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
    // Check if Google OAuth redirect provided a token or oauth=success flag
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      if (token) {
        setAuthToken(token);
      }

      if (searchParams.has('oauth') || token) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authService.login({ email, password });
      if (res && res.data) {
        if (res.data.token) {
          setAuthToken(res.data.token);
        }
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
        if (res.data.token) {
          setAuthToken(res.data.token);
        }
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
      setAuthToken(null);
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
