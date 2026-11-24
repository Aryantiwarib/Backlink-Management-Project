import mongoose from 'mongoose';
import MonitoringScan from '../../models/MonitoringScan.js';
import MonitoringEvent from '../../models/MonitoringEvent.js';
import MonitoringSetting from '../../models/MonitoringSetting.js';
import Backlink from '../../models/Backlink.js';
import Website from '../../models/Website.js';
import { seoService } from '../seo/seoService.js';
import { BacklinkStorageService } from '../backlinkStorageService.js';

const backlinkStorage = new BacklinkStorageService();

// Manual scan cooldown in milliseconds (60 seconds)
export const MANUAL_SCAN_COOLDOWN_MS = 60 * 1000;

// Stuck scan timeout (10 minutes)
const STUCK_SCAN_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Calculate the next scheduled scan date based on frequency
 * @param {string} frequency - 'daily' | 'weekly' | 'biweekly' | 'monthly'
 * @param {Date} [from=new Date()]
 * @returns {Date}
 */
export function calculateNextScanDate(frequency = 'weekly', from = new Date()) {
  const base = new Date(from);
  switch (frequency) {
    case 'daily':
      base.setDate(base.getDate() + 1);
      break;
    case 'biweekly':
      base.setDate(base.getDate() + 14);
      break;
    case 'monthly':
      base.setDate(base.getDate() + 30);
      break;
    case 'weekly':
    default:
      base.setDate(base.getDate() + 7);
      break;
  }
  return base;
}

export class MonitoringService {
  /**
   * Get monitoring settings for a specific website, creating defaults if not yet created.
   */
  async getSettings({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to retrieve monitoring settings.');
    }

    let settings = await MonitoringSetting.findOne({ userId, websiteId });

    if (!settings) {
      settings = await MonitoringSetting.create({
        userId,
        websiteId,
        enabled: false,
        frequency: 'weekly',
        nextScanAt: calculateNextScanDate('weekly')
      });
    }

    return settings.toSafeObject();
  }

  /**
   * Update monitoring settings for a website (enable/pause, frequency, alert preferences)
   */
  async updateSettings({
    userId,
    websiteId,
    enabled,
    frequency,
    emailAlerts,
    alertOnNew,
    alertOnLost,
    alertOnChanged
  }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to update monitoring settings.');
    }

    let settings = await MonitoringSetting.findOne({ userId, websiteId });

    if (!settings) {
      settings = new MonitoringSetting({
        userId,
        websiteId
      });
    }

    if (typeof enabled === 'boolean') {
      const wasDisabled = !settings.enabled && enabled;
      settings.enabled = enabled;
      if (wasDisabled) {
        // If newly enabled, set nextScanAt if it's unset or in the past
        if (!settings.nextScanAt || new Date(settings.nextScanAt) <= new Date()) {
          settings.nextScanAt = new Date();
        }
      }
    }

    if (frequency && ['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
      settings.frequency = frequency;
      // If enabled, recalculate nextScanAt if not already running
      if (settings.enabled && !settings.isScanning) {
        settings.nextScanAt = calculateNextScanDate(frequency, settings.lastScanAt || new Date());
      }
    }

    if (typeof emailAlerts === 'boolean') settings.emailAlerts = emailAlerts;
    if (typeof alertOnNew === 'boolean') settings.alertOnNew = alertOnNew;
    if (typeof alertOnLost === 'boolean') settings.alertOnLost = alertOnLost;
    if (typeof alertOnChanged === 'boolean') settings.alertOnChanged = alertOnChanged;

    await settings.save();
    return settings.toSafeObject();
  }

  /**
   * Run a backlink monitoring scan for a website.
   * Handles concurrency locks, cooldown safeguards, baseline detection, and differential comparison.
   *
   * @param {Object} params
   * @param {string|ObjectId} params.userId
   * @param {string|ObjectId} params.websiteId
   * @param {string} [params.triggerType='manual'] - 'manual' | 'scheduled'
   * @param {Array<Object>} [params.mockFreshLinks] - Optional injection for testing
   * @returns {Promise<Object>} Scan results
   */
  async runScan({ userId, websiteId, triggerType = 'manual', mockFreshLinks = null }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to run a scan.');
    }

    // 1. Verify website ownership
    const website = await Website.findOne({ _id: websiteId, userId });
    if (!website) {
      const notFoundErr = new Error('Website not found or does not belong to the user.');
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    // 2. Load or initialize settings
    let settings = await MonitoringSetting.findOne({ userId, websiteId });
    if (!settings) {
      settings = await MonitoringSetting.create({
        userId,
        websiteId,
        enabled: false,
        frequency: 'weekly'
      });
    }

    // 3. Concurrency guard: check if already running
    if (settings.isScanning) {
      // Check if scan is stuck (> 10 mins)
      const lastScan = await MonitoringScan.findOne({ websiteId, scanStatus: 'running' }).sort({
        scanStartedAt: -1
      });
      const isStuck =
        lastScan && Date.now() - new Date(lastScan.scanStartedAt).getTime() > STUCK_SCAN_TIMEOUT_MS;

      if (isStuck) {
        lastScan.scanStatus = 'failed';
        lastScan.errorMessage = 'Scan timed out after 10 minutes';
        lastScan.scanCompletedAt = new Date();
        await lastScan.save();
      } else {
        const busyErr = new Error('A monitoring scan is already in progress for this website.');
        busyErr.status = 409;
        busyErr.code = 'SCAN_IN_PROGRESS';
        throw busyErr;
      }
    }

    // 4. Cooldown guard for manual trigger
    if (triggerType === 'manual' && settings.lastManualScanAt) {
      const elapsed = Date.now() - new Date(settings.lastManualScanAt).getTime();
      if (elapsed < MANUAL_SCAN_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((MANUAL_SCAN_COOLDOWN_MS - elapsed) / 1000);
        const cooldownErr = new Error(
          `Manual scan cooldown active. Please wait ${remainingSeconds}s before initiating another scan.`
        );
        cooldownErr.status = 429;
        cooldownErr.code = 'SCAN_COOLDOWN';
        cooldownErr.remainingSeconds = remainingSeconds;
        throw cooldownErr;
      }
    }

    // 5. Acquire scanning lock
    settings.isScanning = true;
    await settings.save();

    const providerId = seoService.provider?.id || 'moz';

    // 6. Create running scan record
    const scan = await MonitoringScan.create({
      userId,
      websiteId,
      domain: website.domain,
      scanStartedAt: new Date(),
      scanStatus: 'running',
      triggerType,
      provider: providerId
    });

    try {
      // 7. Fetch fresh backlinks from provider (or use mocked data for test suite)
      let freshLinks = [];
      if (Array.isArray(mockFreshLinks)) {
        freshLinks = mockFreshLinks;
      } else {
        freshLinks = await seoService.fetchBacklinks(website.domain, { limit: 50 });

        // Synchronize snapshot in background if available
        try {
          const overview = await seoService.getOverview(website.domain);
          if (overview && overview.data) {
            await backlinkStorage.saveSnapshot({
              userId,
              websiteId,
              domain: website.domain,
              seoData: overview,
              provider: providerId
            });
          }
        } catch (snapshotErr) {
          // Snapshot fetch failure does not abort backlink scan
          console.warn('[MonitoringService] Snapshot sync notice:', snapshotErr.message);
        }
      }

      // 8. Fetch existing backlinks in database for this website
      const existingBacklinks = await Backlink.find({ websiteId, userId });

      // Determine if this is a baseline scan
      const priorCompletedScans = await MonitoringScan.countDocuments({
        websiteId,
        scanStatus: 'completed'
      });
      const isBaseline = priorCompletedScans === 0 && existingBacklinks.length === 0;

      let newCount = 0;
      let lostCount = 0;
      let changedCount = 0;
      const eventsToCreate = [];

      if (isBaseline) {
        // --- BASELINE ESTABLISHMENT ---
        // Save all fetched backlinks with status 'active'
        // Crucial requirement: No new or lost backlink events generated on baseline scan!
        if (freshLinks.length > 0) {
          await backlinkStorage.saveBacklinks({
            userId,
            websiteId,
            backlinksList: freshLinks,
            provider: providerId
          });
        }
        newCount = 0;
        lostCount = 0;
        changedCount = 0;
      } else {
        // --- SUBSEQUENT SCAN: DIFFERENTIAL COMPARISON ---
        const linkKey = (src, tgt) => `${(src || '').trim().toLowerCase()}||${(tgt || '').trim().toLowerCase()}`;

        // Map existing links by source + target
        const existingMap = new Map();
        const activeExistingMap = new Map();
        for (const bl of existingBacklinks) {
          const key = linkKey(bl.sourceUrl, bl.targetUrl);
          existingMap.set(key, bl);
          if (bl.status === 'active') {
            activeExistingMap.set(key, bl);
          }
        }

        // Map fresh links by source + target
        const freshMap = new Map();
        for (const fl of freshLinks) {
          const key = linkKey(fl.sourceUrl, fl.targetUrl);
          freshMap.set(key, fl);
        }

        // 1. Detect NEW or RECOVERED backlinks
        for (const [key, freshLink] of freshMap.entries()) {
          const existing = existingMap.get(key);
          const wasActive = activeExistingMap.has(key);

          if (!wasActive) {
            // Either never existed or was previously marked lost
            newCount++;
            eventsToCreate.push({
              userId,
              websiteId,
              scanId: scan._id,
              eventType: 'new_backlink',
              sourceUrl: freshLink.sourceUrl,
              sourceDomain: freshLink.sourceDomain || '',
              targetUrl: freshLink.targetUrl,
              anchorText: freshLink.anchorText || '',
              linkType: freshLink.linkType || 'unknown',
              severity: 'info',
              meta: {
                previousStatus: existing ? existing.status : 'never_seen'
              }
            });
          }
        }

        // 2. Detect CHANGED backlinks among currently active
        for (const [key, freshLink] of freshMap.entries()) {
          const existing = activeExistingMap.get(key);
          if (existing) {
            const anchorChanged =
              typeof freshLink.anchorText === 'string' &&
              freshLink.anchorText.trim() !== (existing.anchorText || '').trim();

            const linkTypeChanged =
              freshLink.linkType &&
              freshLink.linkType !== 'unknown' &&
              existing.linkType &&
              existing.linkType !== 'unknown' &&
              freshLink.linkType !== existing.linkType;

            if (anchorChanged || linkTypeChanged) {
              changedCount++;
              eventsToCreate.push({
                userId,
                websiteId,
                scanId: scan._id,
                eventType: 'backlink_changed',
                sourceUrl: freshLink.sourceUrl,
                sourceDomain: freshLink.sourceDomain || existing.sourceDomain,
                targetUrl: freshLink.targetUrl,
                anchorText: freshLink.anchorText || existing.anchorText,
                linkType: freshLink.linkType || existing.linkType,
                previousValues: {
                  anchorText: existing.anchorText || '',
                  linkType: existing.linkType || 'unknown'
                },
                newValues: {
                  anchorText: freshLink.anchorText || '',
                  linkType: freshLink.linkType || 'unknown'
                },
                severity: 'info'
              });
            }
          }
        }

        // 3. Detect LOST backlinks (active backlinks missing from current scan)
        for (const [key, existing] of activeExistingMap.entries()) {
          if (!freshMap.has(key)) {
            lostCount++;
            eventsToCreate.push({
              userId,
              websiteId,
              scanId: scan._id,
              eventType: 'lost_backlink',
              sourceUrl: existing.sourceUrl,
              sourceDomain: existing.sourceDomain,
              targetUrl: existing.targetUrl,
              anchorText: existing.anchorText,
              linkType: existing.linkType,
              severity: 'warning'
            });

            // Mark backlink as lost in database — DO NOT DELETE
            await Backlink.updateOne(
              { _id: existing._id },
              {
                $set: {
                  status: 'lost',
                  fetchedAt: new Date()
                }
              }
            );
          }
        }

        // 4. Update / upsert fresh links to active status & refresh timestamps
        if (freshLinks.length > 0) {
          await backlinkStorage.saveBacklinks({
            userId,
            websiteId,
            backlinksList: freshLinks,
            provider: providerId
          });
          // Explicitly ensure status is active for all fresh links
          await Backlink.updateMany(
            {
              websiteId,
              sourceUrl: { $in: freshLinks.map((f) => f.sourceUrl.trim()) }
            },
            { $set: { status: 'active' } }
          );
        }

        // 5. Save generated events
        if (eventsToCreate.length > 0) {
          await MonitoringEvent.insertMany(eventsToCreate);
        }
      }

      // 9. Update Scan record to completed
      scan.scanStatus = 'completed';
      scan.scanCompletedAt = new Date();
      scan.backlinksChecked = freshLinks.length;
      scan.newBacklinksCount = newCount;
      scan.lostBacklinksCount = lostCount;
      scan.changedBacklinksCount = changedCount;
      scan.isBaseline = isBaseline;
      await scan.save();

      // 10. Update Monitoring Settings
      settings.lastScanAt = new Date();
      settings.isScanning = false;
      if (triggerType === 'manual') {
        settings.lastManualScanAt = new Date();
      }
      settings.nextScanAt = calculateNextScanDate(settings.frequency, new Date());
      await settings.save();

      return {
        success: true,
        scan: scan.toSafeObject(),
        settings: settings.toSafeObject(),
        summary: {
          isBaseline,
          backlinksChecked: freshLinks.length,
          newBacklinksCount: newCount,
          lostBacklinksCount: lostCount,
          changedBacklinksCount: changedCount,
          eventsCreated: eventsToCreate.length
        }
      };
    } catch (scanErr) {
      // 11. Handle failed scan safety:
      // Never mark backlinks as lost if a scan fails!
      scan.scanStatus = 'failed';
      scan.scanCompletedAt = new Date();
      scan.errorMessage = scanErr.message || 'Scan failed';
      await scan.save();

      if (triggerType === 'manual') {
        settings.lastManualScanAt = new Date();
      }
      settings.isScanning = false;
      await settings.save();

      throw scanErr;
    }
  }

  /**
   * Retrieve scan history for a website with pagination
   */
  async getScanHistory({ userId, websiteId, page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId, websiteId };

    const [total, scans] = await Promise.all([
      MonitoringScan.countDocuments(query),
      MonitoringScan.find(query).sort({ scanStartedAt: -1 }).skip(skip).limit(limitNum)
    ]);

    return {
      scans: scans.map((s) => s.toSafeObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Retrieve monitoring events / alerts with filtering and pagination
   */
  async getEvents({ userId, websiteId, eventType, isRead, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId, websiteId };

    if (eventType && ['new_backlink', 'lost_backlink', 'backlink_changed'].includes(eventType)) {
      query.eventType = eventType;
    }

    if (typeof isRead === 'boolean' || isRead === 'true' || isRead === 'false') {
      query.isRead = isRead === true || isRead === 'true';
    }

    const [total, events, unreadCount] = await Promise.all([
      MonitoringEvent.countDocuments(query),
      MonitoringEvent.find(query).sort({ detectedAt: -1 }).skip(skip).limit(limitNum),
      MonitoringEvent.countDocuments({ userId, websiteId, isRead: false })
    ]);

    return {
      events: events.map((e) => e.toSafeObject()),
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Mark a single event as read
   */
  async markEventRead({ userId, eventId }) {
    if (!userId || !eventId) {
      throw new Error('userId and eventId are required.');
    }

    const event = await MonitoringEvent.findOneAndUpdate(
      { _id: eventId, userId },
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    );

    if (!event) {
      const err = new Error('Event not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    return event.toSafeObject();
  }

  /**
   * Mark all events for a website as read
   */
  async markAllEventsRead({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required.');
    }

    const result = await MonitoringEvent.updateMany(
      { userId, websiteId, isRead: false },
      { $set: { isRead: true } }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Get monitoring summary stats for dashboard and monitoring header
   */
  async getMonitoringSummary({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required.');
    }

    const [settings, totalScans, totalEvents, unreadCount, newCount, lostCount, changedCount, latestScan] =
      await Promise.all([
        this.getSettings({ userId, websiteId }),
        MonitoringScan.countDocuments({ userId, websiteId }),
        MonitoringEvent.countDocuments({ userId, websiteId }),
        MonitoringEvent.countDocuments({ userId, websiteId, isRead: false }),
        MonitoringEvent.countDocuments({ userId, websiteId, eventType: 'new_backlink' }),
        MonitoringEvent.countDocuments({ userId, websiteId, eventType: 'lost_backlink' }),
        MonitoringEvent.countDocuments({ userId, websiteId, eventType: 'backlink_changed' }),
        MonitoringScan.findOne({ userId, websiteId }).sort({ scanStartedAt: -1 })
      ]);

    return {
      settings,
      stats: {
        totalScans,
        totalEvents,
        unreadCount,
        newBacklinksCount: newCount,
        lostBacklinksCount: lostCount,
        changedBacklinksCount: changedCount,
        latestScan: latestScan ? latestScan.toSafeObject() : null
      }
    };
  }

  /**
   * Get all unread alerts for a user across all their websites (for header bell)
   */
  async getUnreadAlerts({ userId, limit = 10 }) {
    if (!userId) {
      throw new Error('userId is required.');
    }

    const [totalUnread, alerts] = await Promise.all([
      MonitoringEvent.countDocuments({ userId, isRead: false }),
      MonitoringEvent.find({ userId, isRead: false })
        .populate('websiteId', 'domain name')
        .sort({ detectedAt: -1 })
        .limit(limit)
    ]);

    return {
      totalUnread,
      alerts: alerts.map((a) => {
        const safe = a.toSafeObject();
        safe.website = a.websiteId
          ? {
              id: a.websiteId._id?.toString(),
              domain: a.websiteId.domain,
              name: a.websiteId.name
            }
          : null;
        return safe;
      })
    };
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;
