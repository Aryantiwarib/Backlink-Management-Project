import express from 'express';
import {
  getOverview,
  getBacklinkGrowth,
  getRecentBacklinks,
  getRecentActivity,
  getContentOverview,
  getAlerts
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/overview', getOverview);
router.get('/backlink-growth', getBacklinkGrowth);
router.get('/recent-backlinks', getRecentBacklinks);
router.get('/recent-activity', getRecentActivity);
router.get('/content-overview', getContentOverview);
router.get('/alerts', getAlerts);

export default router;
