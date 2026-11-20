import { mockDashboardData, mockWebsites } from '../data/mockDashboard.js';
import { mockGrowthData } from '../data/mockGrowth.js';
import { mockBacklinks } from '../data/mockBacklinks.js';
import { mockActivities } from '../data/mockActivity.js';
import { mockContentOverview } from '../data/mockContent.js';
import { mockAlerts } from '../data/mockAlerts.js';

export const getOverview = (req, res) => {
  try {
    const website = req.query.website || 'growthlabs.io';
    const range = (req.query.range || '30d').toLowerCase();

    // Default to growthlabs.io 30d if specific key not matched
    const siteData = mockDashboardData[website] || mockDashboardData['growthlabs.io'];
    const rangeData = siteData[range] || siteData['30d'] || mockDashboardData['growthlabs.io']['30d'];

    return res.status(200).json({
      success: true,
      meta: {
        website,
        range,
        timestamp: new Date().toISOString()
      },
      data: {
        websites: mockWebsites,
        ...rangeData
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard overview data',
      error: error.message
    });
  }
};

export const getBacklinkGrowth = (req, res) => {
  try {
    const range = (req.query.range || '30D').toUpperCase();
    const data = mockGrowthData[range] || mockGrowthData['30D'];

    return res.status(200).json({
      success: true,
      meta: {
        range,
        dataPoints: data.length
      },
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve backlink growth series',
      error: error.message
    });
  }
};

export const getRecentBacklinks = (req, res) => {
  try {
    const { search, status, limit } = req.query;
    let list = [...mockBacklinks];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => 
        b.domain.toLowerCase().includes(q) || 
        b.anchorText.toLowerCase().includes(q) ||
        b.sourcePath.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      list = list.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    if (limit) {
      list = list.slice(0, parseInt(limit, 10));
    }

    return res.status(200).json({
      success: true,
      meta: {
        total: list.length,
        totalUnfiltered: mockBacklinks.length
      },
      data: list
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent backlinks',
      error: error.message
    });
  }
};

export const getRecentActivity = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      meta: {
        total: mockActivities.length
      },
      data: mockActivities
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activities',
      error: error.message
    });
  }
};

export const getContentOverview = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: mockContentOverview
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve content overview',
      error: error.message
    });
  }
};

export const getAlerts = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      meta: {
        total: mockAlerts.length,
        hasUrgent: mockAlerts.some(a => a.severity === 'error')
      },
      data: mockAlerts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts',
      error: error.message
    });
  }
};
