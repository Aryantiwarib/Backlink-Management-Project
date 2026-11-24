import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Link Prospecting & Discovery API Client
 */
export const prospectApi = {
  /**
   * Get discovery provider status
   */
  async getDiscoveryStatus() {
    const res = await fetch(`${API_BASE}/prospects/discovery/status`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch discovery status');
    }
    return data.status;
  },

  /**
   * Discover prospects via competitor backlinks
   */
  async discoverCompetitors(websiteId, { competitorDomains = [], limit = 30 } = {}) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/discover/competitor`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ competitorDomains, limit })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Competitor discovery failed');
    }
    return data;
  },

  /**
   * Discover prospects via niche / topic keywords
   */
  async discoverKeywords(websiteId, { keyword = '', limit = 20 } = {}) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/discover/keyword`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ keyword, limit })
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Keyword discovery failed');
      err.code = data.code;
      err.details = data.details;
      throw err;
    }
    return data;
  },

  /**
   * Enrich a specific prospect domain with live SEO metrics
   */
  async enrichDomain(websiteId, domain) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/enrich`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ domain })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Domain enrichment failed');
    }
    return data;
  },

  /**
   * Save a single prospect
   */
  async saveProspect(websiteId, prospectData) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(prospectData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save prospect');
    }
    return data;
  },

  /**
   * Bulk save multiple candidate prospects
   */
  async bulkSaveProspects(websiteId, prospectsList = []) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/bulk-save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ prospectsList })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to bulk save prospects');
    }
    return data;
  },

  /**
   * Retrieve saved prospects with database filtering, search, sorting and pagination
   */
  async getSavedProspects(websiteId, params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlParams.append(key, String(val));
      }
    });

    const res = await fetch(`${API_BASE}/prospects/${websiteId}?${urlParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch saved prospects');
    }
    return data;
  },

  /**
   * Get single prospect details
   */
  async getProspectById(websiteId, prospectId) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/${prospectId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch prospect details');
    }
    return data.prospect;
  },

  /**
   * Update prospect status, notes, tags
   */
  async updateProspect(websiteId, prospectId, updateData) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/${prospectId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update prospect');
    }
    return data.prospect;
  },

  /**
   * Delete single prospect
   */
  async deleteProspect(websiteId, prospectId) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/${prospectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete prospect');
    }
    return data;
  },

  /**
   * Bulk update status for multiple prospects
   */
  async bulkUpdateStatus(websiteId, { prospectIds = [], status }) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/bulk-update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ prospectIds, status })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to bulk update status');
    }
    return data;
  },

  /**
   * Bulk delete multiple prospects
   */
  async bulkDelete(websiteId, prospectIds = []) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/bulk-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ prospectIds })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to bulk delete prospects');
    }
    return data;
  },

  /**
   * Get summary statistics
   */
  async getStats(websiteId) {
    const res = await fetch(`${API_BASE}/prospects/${websiteId}/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch prospect stats');
    }
    return data.stats;
  },

  /**
   * Get direct URL for CSV download
   */
  getCsvExportUrl(websiteId, { search = '', status = '', source = '' } = {}) {
    const urlParams = new URLSearchParams();
    if (search) urlParams.append('search', search);
    if (status && status !== 'all') urlParams.append('status', status);
    if (source && source !== 'all') urlParams.append('source', source);

    return `${API_BASE}/prospects/${websiteId}/export/csv?${urlParams.toString()}`;
  }
};

export default prospectApi;
