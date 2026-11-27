import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Bulk Email Automation API Service Client
 */
export const bulkEmailApi = {
  /**
   * Generate ONE common email template with dynamic placeholders
   */
  async generateTemplate(params) {
    const res = await fetch(`${API_BASE}/outreach/bulk/template/generate`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate common email template');
    }
    return data;
  },

  /**
   * Modify existing common email template (quick actions or custom instructions)
   */
  async modifyTemplate(params) {
    const res = await fetch(`${API_BASE}/outreach/bulk/template/modify`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to modify email template');
    }
    return data;
  },

  /**
   * Render batch preview of personalized emails for every selected prospect
   */
  async previewBatch(params) {
    const res = await fetch(`${API_BASE}/outreach/bulk/preview`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate preview for selected prospects');
    }
    return data;
  },

  /**
   * Dispatch personalized individual emails in bulk to all selected prospects
   */
  async sendBulk(params) {
    const res = await fetch(`${API_BASE}/outreach/bulk/send`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send bulk outreach emails');
    }
    return data;
  },

  /**
   * Retry sending a single failed email
   */
  async retrySingle(params) {
    const res = await fetch(`${API_BASE}/outreach/bulk/retry`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retry email dispatch');
    }
    return data;
  }
};

export default bulkEmailApi;
