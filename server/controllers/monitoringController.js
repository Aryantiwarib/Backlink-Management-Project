import mongoose from 'mongoose';
import { monitoringService } from '../services/monitoring/monitoringService.js';
import Website from '../models/Website.js';

/**
 * Validate websiteId and ownership helper
 */
async function validateWebsiteOwnership(websiteId, userId) {
  if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
    const err = new Error('Invalid website ID format.');
    err.status = 400;
    throw err;
  }

  const website = await Website.findOne({ _id: websiteId, userId });
  if (!website) {
    const err = new Error('Website not found or does not belong to the authenticated user.');
    err.status = 404;
    throw err;
  }
  return website;
}

/**
 * GET /api/monitoring/:websiteId/settings
 */
export async function getSettings(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsiteOwnership(websiteId, userId);
    const settings = await monitoringService.getSettings({ userId, websiteId });

    return res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/monitoring/:websiteId/settings
 */
export async function updateSettings(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { enabled, frequency, emailAlerts, alertOnNew, alertOnLost, alertOnChanged } = req.body;

    await validateWebsiteOwnership(websiteId, userId);

    const settings = await monitoringService.updateSettings({
      userId,
      websiteId,
      enabled,
      frequency,
      emailAlerts,
      alertOnNew,
      alertOnLost,
      alertOnChanged
    });

    return res.status(200).json({
      success: true,
      message: 'Monitoring settings updated successfully.',
      settings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/monitoring/:websiteId/scan
 * Triggers a manual backlink scan
 */
export async function triggerScan(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsiteOwnership(websiteId, userId);

    const result = await monitoringService.runScan({
      userId,
      websiteId,
      triggerType: 'manual'
    });

    return res.status(200).json({
      success: true,
      message: result.summary.isBaseline
        ? 'Baseline scan completed successfully.'
        : 'Backlink monitoring scan completed successfully.',
      ...result
    });
  } catch (err) {
    if (err.code === 'SCAN_COOLDOWN') {
      return res.status(429).json({
        success: false,
        message: err.message,
        code: 'SCAN_COOLDOWN',
        remainingSeconds: err.remainingSeconds
      });
    }
    if (err.code === 'SCAN_IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        message: err.message,
        code: 'SCAN_IN_PROGRESS'
      });
    }
    next(err);
  }
}

/**
 * GET /api/monitoring/:websiteId/scans
 * Get paginated scan history
 */
export async function getScanHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { page, limit } = req.query;

    await validateWebsiteOwnership(websiteId, userId);

    const history = await monitoringService.getScanHistory({
      userId,
      websiteId,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      ...history
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/monitoring/:websiteId/events
 * Get paginated monitoring events/alerts with filtering
 */
export async function getEvents(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { eventType, isRead, page, limit } = req.query;

    await validateWebsiteOwnership(websiteId, userId);

    const result = await monitoringService.getEvents({
      userId,
      websiteId,
      eventType,
      isRead,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/monitoring/events/:eventId/read
 * Mark a single event as read
 */
export async function markEventRead(req, res, next) {
  try {
    const userId = req.user._id;
    const { eventId } = req.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format.'
      });
    }

    const event = await monitoringService.markEventRead({ userId, eventId });

    return res.status(200).json({
      success: true,
      message: 'Event marked as read.',
      event
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/monitoring/:websiteId/events/read-all
 * Mark all events for a website as read
 */
export async function markAllEventsRead(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsiteOwnership(websiteId, userId);

    const result = await monitoringService.markAllEventsRead({ userId, websiteId });

    return res.status(200).json({
      success: true,
      message: 'All events marked as read.',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/monitoring/:websiteId/summary
 * Get summary stats for monitoring page
 */
export async function getMonitoringSummary(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsiteOwnership(websiteId, userId);

    const summary = await monitoringService.getMonitoringSummary({ userId, websiteId });

    return res.status(200).json({
      success: true,
      ...summary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/monitoring/alerts/unread
 * Get all unread alerts across all user websites (for header bell)
 */
export async function getUnreadAlerts(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await monitoringService.getUnreadAlerts({ userId, limit });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}
