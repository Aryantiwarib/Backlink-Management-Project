import express from 'express';
import {
  getOverview,
  getBacklinkAnalytics,
  getCampaignAnalytics,
  getProspectAnalytics,
  getOutreachAnalytics,
  getSeoInsights,
  getExecutiveReport,
  exportAnalyticsCsv
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/overview', getOverview);
router.get('/backlinks', getBacklinkAnalytics);
router.get('/campaigns', getCampaignAnalytics);
router.get('/prospects', getProspectAnalytics);
router.get('/outreach', getOutreachAnalytics);
router.get('/insights', getSeoInsights);
router.get('/report', getExecutiveReport);
router.get('/export/csv', exportAnalyticsCsv);

// Default endpoint alias to overview
router.get('/', getOverview);

export default router;
