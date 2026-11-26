import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Assistant API Client (Phase 12: LINKORA AI SEO Assistant)
 */
export const assistantApi = {
  /**
   * List all conversation threads for the authenticated user
   */
  async listConversations(params = {}) {
    const urlParams = new URLSearchParams();
    if (params.websiteId) urlParams.append('websiteId', params.websiteId);
    if (params.limit) urlParams.append('limit', String(params.limit));

    const queryStr = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/assistant/conversations${queryStr}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load conversations');
    }
    return data.conversations || [];
  },

  /**
   * Get single conversation with full message history and tool calls
   */
  async getConversation(conversationId) {
    const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load conversation');
    }
    return data.conversation;
  },

  /**
   * Create a new conversation thread
   */
  async createConversation({ websiteId, title, initialMessage }) {
    const res = await fetch(`${API_BASE}/assistant/conversations`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ websiteId, title, initialMessage })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create conversation');
    }
    return data.conversation;
  },

  /**
   * Send a user message to an active conversation
   */
  async sendMessage(conversationId, { content, websiteId }) {
    const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ content, websiteId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send message');
    }
    return data.conversation;
  },

  /**
   * Delete an entire conversation thread
   */
  async deleteConversation(conversationId) {
    const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete conversation');
    }
    return data;
  },

  /**
   * Clear message history inside an existing conversation
   */
  async clearMessages(conversationId) {
    const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/messages`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to clear conversation messages');
    }
    return data.conversation;
  }
};
