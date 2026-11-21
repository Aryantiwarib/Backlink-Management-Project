/**
 * Centralized API & Backend Configuration
 *
 * Resolves endpoints from Vite environment variables (.env):
 * - VITE_BACKEND_URL (default: 'http://localhost:5002')
 * - VITE_API_URL     (default: 'http://localhost:5002/api' in dev, or '/api')
 */

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5002'
    : '');

export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (BACKEND_URL ? `${BACKEND_URL}/api` : '/api');

export const GOOGLE_AUTH_URL = `${API_BASE}/auth/google`;

export default {
  BACKEND_URL,
  API_BASE,
  GOOGLE_AUTH_URL
};
