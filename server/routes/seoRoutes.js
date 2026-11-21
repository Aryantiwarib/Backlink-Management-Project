import express from 'express';
import {
  getProviderStatus,
  getOverview,
  getDomainMetrics,
  getBacklinkSummary,
  getLatestSnapshot,
  getSnapshotHistory,
  syncSeoData
} from '../controllers/seoController.js';

const router = express.Router();

router.get('/provider-status', getProviderStatus);
router.get('/overview', getOverview);
router.get('/domain-metrics', getDomainMetrics);
router.get('/backlink-summary', getBacklinkSummary);

// Phase 5: Historical SEO Snapshots & Sync APIs
router.get('/snapshots/latest', getLatestSnapshot);
router.get('/snapshots/history', getSnapshotHistory);
router.post('/sync', syncSeoData);

export default router;
