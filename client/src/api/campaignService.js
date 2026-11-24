import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Campaign Management API Client (Phase 10)
 */
export const campaignApi = {
  /**
   * Get high-level campaign summary stats
   */
  async getCampaignStats(websiteId) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch campaign stats');
    }
    return data.stats;
  },

  /**
   * Retrieve campaigns with search, status/type filters, and pagination
   */
  async getCampaigns(websiteId, params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlParams.append(key, String(val));
      }
    });

    const res = await fetch(`${API_BASE}/campaigns/${websiteId}?${urlParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch campaigns');
    }
    return data;
  },

  /**
   * Create a new campaign
   */
  async createCampaign(websiteId, campaignData) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(campaignData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create campaign');
    }
    return data.campaign;
  },

  /**
   * Fetch single campaign by ID with metrics breakdown
   */
  async getCampaignById(websiteId, campaignId) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/${campaignId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch campaign details');
    }
    return data.campaign;
  },

  /**
   * Update campaign details
   */
  async updateCampaign(websiteId, campaignId, updateData) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/${campaignId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update campaign');
    }
    return data.campaign;
  },

  /**
   * Transition campaign lifecycle status (active, paused, completed, archived)
   */
  async updateCampaignStatus(websiteId, campaignId, status) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/${campaignId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update campaign status');
    }
    return data.campaign;
  },

  /**
   * Delete a campaign
   */
  async deleteCampaign(websiteId, campaignId) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/${campaignId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete campaign');
    }
    return data;
  },

  /**
   * Assign Phase 9 prospects to campaign
   */
  async assignProspects(websiteId, campaignId, { prospectIds = [], notes = '' } = {}) {
    const res = await fetch(`${API_BASE}/campaigns/${websiteId}/${campaignId}/prospects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ prospectIds, notes })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to assign prospects to campaign');
    }
    return data;
  },

  /**
   * List assigned prospects for a campaign with outreach status
   */
  async getCampaignProspects(websiteId, campaignId, params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlParams.append(key, String(val));
      }
    });

    const res = await fetch(
      `${API_BASE}/campaigns/${websiteId}/${campaignId}/prospects?${urlParams.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch campaign prospects');
    }
    return data;
  },

  /**
   * Update outreach status, notes, or follow-up date for an assigned prospect
   */
  async updateAssignment(websiteId, campaignId, assignmentId, updateData) {
    const res = await fetch(
      `${API_BASE}/campaigns/${websiteId}/${campaignId}/prospects/${assignmentId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updateData)
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update prospect assignment');
    }
    return data.assignment;
  },

  /**
   * Remove prospect from campaign without deleting original Phase 9 record
   */
  async removeAssignment(websiteId, campaignId, assignmentId) {
    const res = await fetch(
      `${API_BASE}/campaigns/${websiteId}/${campaignId}/prospects/${assignmentId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to remove prospect from campaign');
    }
    return data;
  },

  /**
   * Bulk update outreach status for multiple assigned prospects
   */
  async bulkUpdateAssignmentsStatus(websiteId, campaignId, { assignmentIds = [], outreachStatus }) {
    const res = await fetch(
      `${API_BASE}/campaigns/${websiteId}/${campaignId}/prospects/bulk-status`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ assignmentIds, outreachStatus })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to bulk update outreach status');
    }
    return data;
  },

  /**
   * Get chronological activity timeline for a campaign
   */
  async getCampaignActivities(websiteId, campaignId, { limit = 50 } = {}) {
    const res = await fetch(
      `${API_BASE}/campaigns/${websiteId}/${campaignId}/activities?limit=${limit}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch campaign activities');
    }
    return data.activities;
  }
};

export default campaignApi;
