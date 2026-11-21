import express from 'express';
import {
  getDashboardData,
  getOverview,
  getBacklinkGrowth,
  getRecentBacklinks,
  getRecentActivity,
  getContentOverview,
  getAlerts
} from '../controllers/dashboardController.js';

const router = express.Router();

// Specific sub-routes first
router.get('/overview', getOverview);
router.get('/backlink-growth', getBacklinkGrowth);
router.get('/recent-backlinks', getRecentBacklinks);
router.get('/recent-activity', getRecentActivity);
router.get('/content-overview', getContentOverview);
router.get('/alerts', getAlerts);

// Primary unified dashboard endpoints
router.get('/', getDashboardData);
router.get('/:websiteId', getDashboardData);

export default router;
