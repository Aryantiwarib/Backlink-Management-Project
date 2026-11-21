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

/**
 * Retrieves the stored JWT/Bearer auth token from localStorage.
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('linkora_auth_token');
  }
  return null;
}

/**
 * Saves or clears the auth token in localStorage.
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('linkora_auth_token', token);
    } else {
      localStorage.removeItem('linkora_auth_token');
    }
  }
}

/**
 * Returns common request headers including Authorization: Bearer <token>
 * if a token is present, along with Content-Type: application/json.
 */
export function getAuthHeaders(customHeaders = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders
  };
}

export default {
  BACKEND_URL,
  API_BASE,
  GOOGLE_AUTH_URL,
  getAuthToken,
  setAuthToken,
  getAuthHeaders
};
