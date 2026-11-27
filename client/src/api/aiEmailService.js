import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * AI Email Generation & Studio API Client
 */
export const aiEmailApi = {
  /**
   * Generate outreach email or 2-3 variations
   */
  async generateEmail(params) {
    const res = await fetch(`${API_BASE}/ai-email/generate`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate outreach email');
    }
    return data;
  },

  /**
   * Modify existing email (tone, length, persuasion, CTA, custom prompt)
   */
  async modifyEmail(params) {
    const res = await fetch(`${API_BASE}/ai-email/modify`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to modify email');
    }
    return data;
  },

  /**
   * Save or update an email draft
   */
  async saveDraft(draftData) {
    const res = await fetch(`${API_BASE}/ai-email/drafts`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(draftData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save email draft');
    }
    return data;
  },

  /**
   * List saved email drafts
   */
  async listDrafts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `${API_BASE}/ai-email/drafts?${query}` : `${API_BASE}/ai-email/drafts`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to list drafts');
    }
    return data;
  },

  /**
   * Get single draft by ID
   */
  async getDraft(draftId) {
    const res = await fetch(`${API_BASE}/ai-email/drafts/${draftId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve draft');
    }
    return data;
  },

  /**
   * Delete / discard a draft
   */
  async deleteDraft(draftId) {
    const res = await fetch(`${API_BASE}/ai-email/drafts/${draftId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to discard draft');
    }
    return data;
  }
};
