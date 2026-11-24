import { API_BASE, getAuthHeaders } from '../config/api';

/**
 * Backlink Monitoring API Client
 */
export const monitoringApi = {
  /**
   * Get monitoring settings for a specific website
   */
  async getSettings(websiteId) {
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch monitoring settings');
    }
    return data.settings;
  },

  /**
   * Update monitoring settings for a specific website
   */
  async updateSettings(websiteId, settings) {
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update monitoring settings');
    }
    return data.settings;
  },

  /**
   * Trigger a manual backlink scan
   */
  async triggerScan(websiteId) {
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/scan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Failed to trigger scan');
      err.status = res.status;
      err.code = data.code;
      err.remainingSeconds = data.remainingSeconds;
      throw err;
    }
    return data;
  },

  /**
   * Get paginated scan history
   */
  async getScanHistory(websiteId, { page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/scans?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch scan history');
    }
    return data;
  },

  /**
   * Get paginated monitoring events/alerts
   */
  async getEvents(websiteId, { page = 1, limit = 20, eventType = 'all', isRead } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (eventType && eventType !== 'all') {
      params.append('eventType', eventType);
    }
    if (typeof isRead === 'boolean') {
      params.append('isRead', String(isRead));
    }

    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/events?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch monitoring events');
    }
    return data;
  },

  /**
   * Mark a single event as read
   */
  async markEventRead(eventId) {
    const res = await fetch(`${API_BASE}/monitoring/events/${eventId}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to mark event as read');
    }
    return data.event;
  },

  /**
   * Mark all events for a website as read
   */
  async markAllEventsRead(websiteId) {
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/events/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to mark all events as read');
    }
    return data;
  },

  /**
   * Get monitoring summary stats
   */
  async getSummary(websiteId) {
    const res = await fetch(`${API_BASE}/monitoring/${websiteId}/summary`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch monitoring summary');
    }
    return data;
  },

  /**
   * Get unread alerts across all websites (for header bell)
   */
  async getUnreadAlerts(limit = 10) {
    const res = await fetch(`${API_BASE}/monitoring/alerts/unread?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch unread alerts');
    }
    return data;
  }
};

export default monitoringApi;
