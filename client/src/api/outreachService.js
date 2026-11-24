import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Outreach & Email API Client (Phase 11)
 */
export const outreachApi = {
  // =========================================================================
  // GMAIL ACCOUNT MANAGEMENT
  // =========================================================================

  /**
   * Get current Gmail connection status
   */
  async getAccountStatus() {
    const res = await fetch(`${API_BASE}/outreach/account`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch email account status');
    }
    return data;
  },

  /**
   * Get Google OAuth authorization URL to initiate Gmail connection
   * @param {string} returnTo - Optional path to return to after authorization
   */
  async getGoogleAuthUrl(returnTo = '/outreach') {
    const params = new URLSearchParams();
    if (returnTo) params.append('returnTo', returnTo);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/outreach/connect/google${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate Google authorization URL');
    }
    return data.authUrl;
  },

  /**
   * Disconnect current Gmail account
   */
  async disconnectAccount() {
    const res = await fetch(`${API_BASE}/outreach/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to disconnect Gmail account');
    }
    return data;
  },

  // =========================================================================
  // EMAIL TEMPLATES
  // =========================================================================

  /**
   * List all saved templates for the user
   */
  async listTemplates() {
    const res = await fetch(`${API_BASE}/outreach/templates`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch email templates');
    }
    return data.templates || [];
  },

  /**
   * Create a new email template
   */
  async createTemplate(templateData) {
    const res = await fetch(`${API_BASE}/outreach/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(templateData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create template');
    }
    return data.template;
  },

  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updateData) {
    const res = await fetch(`${API_BASE}/outreach/templates/${templateId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update template');
    }
    return data.template;
  },

  /**
   * Delete an email template
   */
  async deleteTemplate(templateId) {
    const res = await fetch(`${API_BASE}/outreach/templates/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete template');
    }
    return data;
  },

  // =========================================================================
  // EMAIL COMPOSITION & SENDING
  // =========================================================================

  /**
   * Generate personalized previews for selected prospects
   */
  async previewOutreach(websiteId, campaignId, { prospectIds = [], subject, body, templateId, senderName }) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ prospectIds, subject, body, templateId, senderName })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate email preview');
    }
    return data.previews || [];
  },

  /**
   * Queue email(s) for sending
   */
  async sendOutreach(websiteId, campaignId, payload) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to queue outreach emails');
    }
    return data;
  },

  /**
   * Get queued, sending, and sent emails
   */
  async getQueue(websiteId, campaignId, params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlParams.append(key, String(val));
      }
    });

    const res = await fetch(
      `${API_BASE}/outreach/${websiteId}/${campaignId}/queue?${urlParams.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch email queue');
    }
    return data;
  },

  /**
   * Get outreach statistics & activity history
   */
  async getHistory(websiteId, campaignId) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/history`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch outreach history');
    }
    return data;
  },

  // =========================================================================
  // FOLLOW-UP MANAGEMENT
  // =========================================================================

  /**
   * Schedule a follow-up for a prospect
   */
  async scheduleFollowUp(websiteId, campaignId, payload) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/follow-ups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to schedule follow-up');
    }
    return data.followUp;
  },

  /**
   * List upcoming and overdue follow-ups
   */
  async listFollowUps(websiteId, campaignId) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/follow-ups`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch follow-ups');
    }
    return data;
  },

  /**
   * Cancel a scheduled follow-up
   */
  async cancelFollowUp(websiteId, campaignId, followUpId) {
    const res = await fetch(`${API_BASE}/outreach/${websiteId}/${campaignId}/follow-ups/${followUpId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to cancel follow-up');
    }
    return data;
  }
};

export default outreachApi;
