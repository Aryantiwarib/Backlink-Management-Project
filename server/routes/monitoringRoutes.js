import express from 'express';
import {
  getSettings,
  updateSettings,
  triggerScan,
  getScanHistory,
  getEvents,
  markEventRead,
  markAllEventsRead,
  getMonitoringSummary,
  getUnreadAlerts
} from '../controllers/monitoringController.js';

const router = express.Router();

// User-level alert routes (for header notification bell)
router.get('/alerts/unread', getUnreadAlerts);
router.patch('/events/:eventId/read', markEventRead);

// Website-specific monitoring routes
router.get('/:websiteId/settings', getSettings);
router.put('/:websiteId/settings', updateSettings);
router.post('/:websiteId/scan', triggerScan);
router.get('/:websiteId/scans', getScanHistory);
router.get('/:websiteId/events', getEvents);
router.post('/:websiteId/events/read-all', markAllEventsRead);
router.get('/:websiteId/summary', getMonitoringSummary);

export default router;
