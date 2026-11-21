// Authentication API Service

const getApiBase = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5002/api';
  }
  return '/api';
};

const API_BASE = getApiBase();

async function authFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Ensure session cookies are sent and received
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authService = {
  // Sign up new user
  async signup(userData) {
    return authFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Log in user
  async login(credentials) {
    return authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Log out user
  async logout() {
    return authFetch('/auth/logout', {
      method: 'POST'
    });
  },

  // Get current logged-in user
  async getMe() {
    return authFetch('/auth/me');
  },

  // Check authentication status
  async checkStatus() {
    return authFetch('/auth/status');
  }
};
