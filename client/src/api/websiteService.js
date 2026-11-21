// Website Management API Service

const getApiBase = () => {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5002/api';
  }
  return '/api';
};

const API_BASE = getApiBase();

async function websiteFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
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

export const websiteService = {
  // Get all websites for authenticated user
  async getWebsites() {
    return websiteFetch('/websites');
  },

  // Get active website
  async getActiveWebsite() {
    return websiteFetch('/websites/active');
  },

  // Get single website details (includes verification token & DNS record instructions)
  async getWebsite(id) {
    return websiteFetch(`/websites/${id}`);
  },

  // Create new website
  async createWebsite(data) {
    return websiteFetch('/websites', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Update website details
  async updateWebsite(id, data) {
    return websiteFetch(`/websites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Delete website
  async deleteWebsite(id) {
    return websiteFetch(`/websites/${id}`, {
      method: 'DELETE'
    });
  },

  // Set website as active
  async setActiveWebsite(id) {
    return websiteFetch(`/websites/${id}/active`, {
      method: 'PUT'
    });
  },

  // Verify DNS TXT record
  async verifyDomain(id) {
    return websiteFetch(`/websites/${id}/verify`, {
      method: 'POST'
    });
  }
};
