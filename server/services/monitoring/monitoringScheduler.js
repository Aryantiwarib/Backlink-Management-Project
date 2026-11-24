import MonitoringSetting from '../../models/MonitoringSetting.js';
import { monitoringService } from './monitoringService.js';

let schedulerIntervalId = null;
let isTickRunning = false;

/**
 * Perform a single scheduler check cycle
 */
export async function runMonitoringSchedulerTick() {
  if (isTickRunning) {
    return;
  }
  isTickRunning = true;

  try {
    const now = new Date();

    // Find enabled websites due for scanning that are not currently running
    const dueSettings = await MonitoringSetting.find({
      enabled: true,
      isScanning: false,
      nextScanAt: { $ne: null, $lte: now }
    })
      .limit(5)
      .exec();

    if (dueSettings.length > 0) {
      console.log(`[MonitoringScheduler] Found ${dueSettings.length} websites due for backlink scan.`);

      for (const setting of dueSettings) {
        try {
          console.log(`[MonitoringScheduler] Starting scheduled scan for websiteId: ${setting.websiteId}`);
          await monitoringService.runScan({
            userId: setting.userId,
            websiteId: setting.websiteId,
            triggerType: 'scheduled'
          });
          console.log(`[MonitoringScheduler] Scheduled scan completed for websiteId: ${setting.websiteId}`);
        } catch (scanErr) {
          console.error(
            `[MonitoringScheduler] Error during scheduled scan for website ${setting.websiteId}:`,
            scanErr.message
          );
        }
      }
    }
  } catch (err) {
    console.error('[MonitoringScheduler] Error in scheduler tick:', err.message);
  } finally {
    isTickRunning = false;
  }
}

/**
 * Start the background monitoring scheduler
 * @param {number} [intervalMs=60000] - Polling interval in ms (default 60s)
 */
export function startMonitoringScheduler(intervalMs = 60000) {
  if (schedulerIntervalId) {
    console.log('[MonitoringScheduler] Scheduler is already active.');
    return;
  }

  console.log(`[MonitoringScheduler] Starting background scheduler (tick every ${intervalMs / 1000}s)...`);
  // Run an immediate check on startup
  runMonitoringSchedulerTick().catch((e) => console.error('[MonitoringScheduler] Startup check error:', e.message));

  schedulerIntervalId = setInterval(runMonitoringSchedulerTick, intervalMs);
}

/**
 * Stop the background monitoring scheduler
 */
export function stopMonitoringScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log('[MonitoringScheduler] Background scheduler stopped.');
  }
}
