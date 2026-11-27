import express from 'express';
import {
  getAccountStatus,
  getGoogleAuthUrl,
  handleGoogleCallback,
  disconnectAccount,
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  previewOutreach,
  sendOutreach,
  getQueue,
  getHistory,
  scheduleFollowUp,
  listFollowUps,
  cancelFollowUp,
  trackOpen,
  trackClick
} from '../controllers/outreachController.js';
import {
  generateTemplate,
  modifyTemplate,
  previewBatch,
  sendBulk,
  retrySingle
} from '../controllers/bulkEmailController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// =============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// =============================================================================

// Email open & click tracking
router.get('/track/open/:trackingId', trackOpen);
router.get('/track/click/:trackingId', trackClick);

// Google OAuth redirect callback (matches Google Cloud Console redirect URI)
router.get('/connect/google/callback', handleGoogleCallback);

// =============================================================================
// PROTECTED OUTREACH ENDPOINTS (Requires logged in user session)
// =============================================================================

// Bulk Email Automation & Generation Endpoints
router.post('/bulk/template/generate', ensureAuthenticated, generateTemplate);
router.post('/bulk/template/modify', ensureAuthenticated, modifyTemplate);
router.post('/bulk/preview', ensureAuthenticated, previewBatch);
router.post('/bulk/send', ensureAuthenticated, sendBulk);
router.post('/bulk/retry', ensureAuthenticated, retrySingle);

// Gmail Account Connection & Status
router.get('/account', ensureAuthenticated, getAccountStatus);
router.get('/connect/google', ensureAuthenticated, getGoogleAuthUrl);
router.post('/disconnect', ensureAuthenticated, disconnectAccount);

// Email Templates CRUD
router.get('/templates', ensureAuthenticated, listTemplates);
router.post('/templates', ensureAuthenticated, createTemplate);
router.get('/templates/:templateId', ensureAuthenticated, getTemplate);
router.patch('/templates/:templateId', ensureAuthenticated, updateTemplate);
router.delete('/templates/:templateId', ensureAuthenticated, deleteTemplate);

// Email Composition & Sending
router.post('/:websiteId/:campaignId/preview', ensureAuthenticated, previewOutreach);
router.post('/:websiteId/:campaignId/send', ensureAuthenticated, sendOutreach);
router.get('/:websiteId/:campaignId/queue', ensureAuthenticated, getQueue);
router.get('/:websiteId/:campaignId/history', ensureAuthenticated, getHistory);

// Follow-up Management
router.post('/:websiteId/:campaignId/follow-ups', ensureAuthenticated, scheduleFollowUp);
router.get('/:websiteId/:campaignId/follow-ups', ensureAuthenticated, listFollowUps);
router.delete('/:websiteId/:campaignId/follow-ups/:followUpId', ensureAuthenticated, cancelFollowUp);

export default router;
