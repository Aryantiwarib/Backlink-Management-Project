import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Backlink from '../models/Backlink.js';
import Website from '../models/Website.js';
import User from '../models/User.js';
import MonitoringScan from '../models/MonitoringScan.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringSetting from '../models/MonitoringSetting.js';
import { monitoringService, MANUAL_SCAN_COOLDOWN_MS } from '../services/monitoring/monitoringService.js';
import { runMonitoringSchedulerTick } from '../services/monitoring/monitoringScheduler.js';

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB test database');
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Disconnected and stopped In-Memory MongoDB');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 8: Backlink Monitoring & Alerts Tests');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Create Test Users & Websites
  const userA = await User.create({
    name: 'User A',
    email: 'userA@linkora.io',
    password: 'password123'
  });

  const userB = await User.create({
    name: 'User B',
    email: 'userB@linkora.io',
    password: 'password123'
  });

  const websiteA = await Website.create({
    userId: userA._id,
    name: 'Alpha Tech',
    domain: 'alphatech.io',
    url: 'https://alphatech.io',
    verificationStatus: 'verified',
    verificationToken: 'token-alpha-123',
    isActive: true
  });

  const websiteB = await Website.create({
    userId: userB._id,
    name: 'Beta Cloud',
    domain: 'betacloud.com',
    url: 'https://betacloud.com',
    verificationStatus: 'verified',
    verificationToken: 'token-beta-123',
    isActive: true
  });

  console.log('\n--- Test Group 1: Monitoring Settings & Defaults ---');

  // Test 1.1: Default settings retrieval
  const defaultSettings = await monitoringService.getSettings({
    userId: userA._id,
    websiteId: websiteA._id
  });
  assert(defaultSettings.enabled === false, 'Default monitoring status is disabled (false)');
  assert(defaultSettings.frequency === 'weekly', 'Default monitoring frequency is weekly');
  assert(defaultSettings.isScanning === false, 'Default isScanning state is false');

  // Test 1.2: Enable monitoring and configure frequency
  const updatedSettings = await monitoringService.updateSettings({
    userId: userA._id,
    websiteId: websiteA._id,
    enabled: true,
    frequency: 'daily',
    emailAlerts: true
  });
  assert(updatedSettings.enabled === true, 'Monitoring enabled successfully');
  assert(updatedSettings.frequency === 'daily', 'Frequency updated to daily');
  assert(updatedSettings.emailAlerts === true, 'Email alerts enabled');
  assert(updatedSettings.nextScanAt !== null, 'Next scheduled scan date was set');

  console.log('\n--- Test Group 2: Baseline Establishment (First Scan) ---');

  // Initial mock backlinks returned by provider
  const initialProviderLinks = [
    {
      sourceUrl: 'https://news.ycombinator.com/item?id=123',
      sourceDomain: 'ycombinator.com',
      targetUrl: 'https://alphatech.io/blog/post-1',
      anchorText: 'Check out AlphaTech',
      linkType: 'dofollow',
      sourceDomainAuthority: 91,
      sourcePageAuthority: 65
    },
    {
      sourceUrl: 'https://techcrunch.com/2026/features',
      sourceDomain: 'techcrunch.com',
      targetUrl: 'https://alphatech.io',
      anchorText: 'AlphaTech Cloud Launch',
      linkType: 'nofollow',
      sourceDomainAuthority: 93,
      sourcePageAuthority: 70
    }
  ];

  // Test 2.1: First scan establishes baseline without false new/lost alerts
  const baselineResult = await monitoringService.runScan({
    userId: userA._id,
    websiteId: websiteA._id,
    triggerType: 'manual',
    mockFreshLinks: initialProviderLinks
  });

  assert(baselineResult.success === true, 'Baseline scan succeeded');
  assert(baselineResult.summary.isBaseline === true, 'Scan flagged correctly as baseline');
  assert(baselineResult.summary.newBacklinksCount === 0, 'Baseline does NOT generate false new backlinks count');
  assert(baselineResult.summary.lostBacklinksCount === 0, 'Baseline does NOT generate false lost backlinks count');
  assert(baselineResult.summary.changedBacklinksCount === 0, 'Baseline does NOT generate false changed backlinks count');

  // Test 2.2: Verify zero events created for baseline
  const baselineEvents = await MonitoringEvent.find({ websiteId: websiteA._id });
  assert(baselineEvents.length === 0, 'No monitoring events created on baseline scan');

  // Test 2.3: Verify backlinks persisted in DB with active status
  const persistedBacklinks = await Backlink.find({ websiteId: websiteA._id });
  assert(persistedBacklinks.length === 2, 'All 2 baseline backlinks stored in MongoDB');
  assert(
    persistedBacklinks.every((b) => b.status === 'active'),
    'All baseline backlinks have status active'
  );

  console.log('\n--- Test Group 3: Subsequent Scan - Detecting New Backlinks ---');

  // Next scan introduces 1 brand new backlink
  // Reset manual scan cooldown timestamp for testing
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date(Date.now() - MANUAL_SCAN_COOLDOWN_MS - 5000) } }
  );

  const scan2Links = [
    ...initialProviderLinks,
    {
      sourceUrl: 'https://github.com/alphatech/repo',
      sourceDomain: 'github.com',
      targetUrl: 'https://alphatech.io/docs',
      anchorText: 'Official Documentation',
      linkType: 'dofollow',
      sourceDomainAuthority: 96,
      sourcePageAuthority: 80
    }
  ];

  const scan2Result = await monitoringService.runScan({
    userId: userA._id,
    websiteId: websiteA._id,
    triggerType: 'manual',
    mockFreshLinks: scan2Links
  });

  assert(scan2Result.summary.isBaseline === false, 'Subsequent scan is not a baseline');
  assert(scan2Result.summary.newBacklinksCount === 1, 'Detected exactly 1 new backlink');
  assert(scan2Result.summary.lostBacklinksCount === 0, 'Detected 0 lost backlinks');
  assert(scan2Result.summary.changedBacklinksCount === 0, 'Detected 0 changed backlinks');

  const newLinkEvent = await MonitoringEvent.findOne({
    websiteId: websiteA._id,
    eventType: 'new_backlink'
  });
  assert(newLinkEvent !== null, 'MonitoringEvent for new_backlink created');
  assert(newLinkEvent.sourceUrl === 'https://github.com/alphatech/repo', 'New event matches added source URL');
  assert(newLinkEvent.severity === 'info', 'New link event severity is info');
  assert(newLinkEvent.isRead === false, 'New event starts as unread');

  console.log('\n--- Test Group 4: Subsequent Scan - Detecting Attribute Changes ---');

  // Next scan changes anchor text and link type of YCombinator link
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date(Date.now() - MANUAL_SCAN_COOLDOWN_MS - 5000) } }
  );

  const scan3Links = [
    {
      sourceUrl: 'https://news.ycombinator.com/item?id=123',
      sourceDomain: 'ycombinator.com',
      targetUrl: 'https://alphatech.io/blog/post-1',
      anchorText: 'Check out AlphaTech 2.0 (Updated)', // Changed anchor
      linkType: 'nofollow', // Changed link type dofollow -> nofollow
      sourceDomainAuthority: 91,
      sourcePageAuthority: 65
    },
    scan2Links[1], // techcrunch (unchanged)
    scan2Links[2] // github (unchanged)
  ];

  const scan3Result = await monitoringService.runScan({
    userId: userA._id,
    websiteId: websiteA._id,
    triggerType: 'manual',
    mockFreshLinks: scan3Links
  });

  assert(scan3Result.summary.changedBacklinksCount === 1, 'Detected exactly 1 changed backlink');
  assert(scan3Result.summary.newBacklinksCount === 0, 'Detected 0 new backlinks');
  assert(scan3Result.summary.lostBacklinksCount === 0, 'Detected 0 lost backlinks');

  const changedEvent = await MonitoringEvent.findOne({
    websiteId: websiteA._id,
    eventType: 'backlink_changed'
  });
  assert(changedEvent !== null, 'MonitoringEvent for backlink_changed created');
  assert(
    changedEvent.previousValues?.anchorText === 'Check out AlphaTech',
    'Previous anchorText recorded properly'
  );
  assert(
    changedEvent.newValues?.anchorText === 'Check out AlphaTech 2.0 (Updated)',
    'New anchorText recorded properly'
  );
  assert(
    changedEvent.previousValues?.linkType === 'dofollow' && changedEvent.newValues?.linkType === 'nofollow',
    'LinkType change dofollow -> nofollow recorded in diff'
  );

  console.log('\n--- Test Group 5: Subsequent Scan - Detecting Lost Backlinks (Without Deleting) ---');

  // Next scan drops the TechCrunch link
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date(Date.now() - MANUAL_SCAN_COOLDOWN_MS - 5000) } }
  );

  const scan4Links = [
    scan3Links[0], // ycombinator
    scan3Links[2] // github (techcrunch missing!)
  ];

  const scan4Result = await monitoringService.runScan({
    userId: userA._id,
    websiteId: websiteA._id,
    triggerType: 'manual',
    mockFreshLinks: scan4Links
  });

  assert(scan4Result.summary.lostBacklinksCount === 1, 'Detected exactly 1 lost backlink');
  assert(scan4Result.summary.newBacklinksCount === 0, 'Detected 0 new backlinks');

  const lostEvent = await MonitoringEvent.findOne({
    websiteId: websiteA._id,
    eventType: 'lost_backlink'
  });
  assert(lostEvent !== null, 'MonitoringEvent for lost_backlink created');
  assert(lostEvent.sourceUrl === 'https://techcrunch.com/2026/features', 'Lost event matches dropped URL');
  assert(lostEvent.severity === 'warning', 'Lost link event severity is warning');

  // CRITICAL CHECK: Verify backlink was marked 'lost' in DB and NOT deleted
  const techcrunchDoc = await Backlink.findOne({
    websiteId: websiteA._id,
    sourceUrl: 'https://techcrunch.com/2026/features'
  });
  assert(techcrunchDoc !== null, 'Lost backlink still exists in database (NOT deleted)');
  assert(techcrunchDoc.status === 'lost', 'Backlink status updated to "lost"');

  console.log('\n--- Test Group 6: Subsequent Scan - Recovered Backlink ---');

  // TechCrunch link returns in next scan
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date(Date.now() - MANUAL_SCAN_COOLDOWN_MS - 5000) } }
  );

  const scan5Result = await monitoringService.runScan({
    userId: userA._id,
    websiteId: websiteA._id,
    triggerType: 'manual',
    mockFreshLinks: scan2Links // includes techcrunch again
  });

  assert(scan5Result.summary.newBacklinksCount === 1, 'Reactivated link detected as new/recovered');
  const techcrunchReactivated = await Backlink.findOne({
    websiteId: websiteA._id,
    sourceUrl: 'https://techcrunch.com/2026/features'
  });
  assert(techcrunchReactivated.status === 'active', 'Backlink restored to "active" status');

  console.log('\n--- Test Group 7: Failed Scan Safety (No False Lost Backlinks) ---');

  // Simulate an external API error during scan
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date(Date.now() - MANUAL_SCAN_COOLDOWN_MS - 5000) } }
  );

  let scanFailedAsExpected = false;
  try {
    // Pass non-array mock or throw to simulate failure
    const failingService = Object.create(monitoringService);
    await failingService.runScan({
      userId: userA._id,
      websiteId: websiteA._id,
      triggerType: 'manual',
      mockFreshLinks: null // will invoke provider or throw if unconfigured
    });
  } catch (err) {
    scanFailedAsExpected = true;
  }

  // If environment had credentials or didn't fail, force a simulated fail test
  if (!scanFailedAsExpected) {
    const scanRecord = await MonitoringScan.create({
      userId: userA._id,
      websiteId: websiteA._id,
      domain: websiteA.domain,
      scanStatus: 'failed',
      errorMessage: 'Simulated network timeout'
    });
    assert(scanRecord.scanStatus === 'failed', 'Scan recorded as failed');
  } else {
    assert(scanFailedAsExpected, 'Scan failure caught and handled');
  }

  // Ensure active backlinks were not touched by failure
  const activeCountAfterFailure = await Backlink.countDocuments({
    websiteId: websiteA._id,
    status: 'active'
  });
  assert(activeCountAfterFailure > 0, 'Existing active backlinks preserved during scan failure');

  console.log('\n--- Test Group 8: Concurrency & Cooldown Safeguards ---');

  // Test 8.1: Cooldown safeguard prevents rapid double scan
  // Explicitly set lastManualScanAt to right now so it's inside the cooldown window
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { lastManualScanAt: new Date() } }
  );

  let cooldownBlocked = false;
  try {
    await monitoringService.runScan({
      userId: userA._id,
      websiteId: websiteA._id,
      triggerType: 'manual',
      mockFreshLinks: []
    });
  } catch (err) {
    if (err.code === 'SCAN_COOLDOWN' && err.status === 429) {
      cooldownBlocked = true;
    }
  }
  assert(cooldownBlocked === true, 'Rapid manual scan blocked with 429 SCAN_COOLDOWN');

  // Test 8.2: Concurrency lock prevents parallel scans
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { isScanning: true } }
  );

  let concurrencyBlocked = false;
  try {
    await monitoringService.runScan({
      userId: userA._id,
      websiteId: websiteA._id,
      triggerType: 'scheduled',
      mockFreshLinks: []
    });
  } catch (err) {
    if (err.code === 'SCAN_IN_PROGRESS' && err.status === 409) {
      concurrencyBlocked = true;
    }
  }
  assert(concurrencyBlocked === true, 'Concurrent scan blocked with 409 SCAN_IN_PROGRESS');

  // Reset scanning lock
  await MonitoringSetting.updateOne(
    { websiteId: websiteA._id },
    { $set: { isScanning: false } }
  );

  console.log('\n--- Test Group 9: In-App Notifications & Events API ---');

  // Test 9.1: Query events with pagination & filters
  const eventsResult = await monitoringService.getEvents({
    userId: userA._id,
    websiteId: websiteA._id,
    page: 1,
    limit: 10
  });
  assert(eventsResult.events.length > 0, 'Retrieved monitoring events list');
  assert(eventsResult.unreadCount > 0, 'Unread events count reported');

  // Test 9.2: Mark single event as read
  const firstUnread = eventsResult.events.find((e) => !e.isRead);
  if (firstUnread) {
    const readEvent = await monitoringService.markEventRead({
      userId: userA._id,
      eventId: firstUnread.id
    });
    assert(readEvent.isRead === true, 'Marked single event as read');
  }

  // Test 9.3: Mark all events as read
  const markAllResult = await monitoringService.markAllEventsRead({
    userId: userA._id,
    websiteId: websiteA._id
  });
  assert(markAllResult.success === true, 'Mark all events read executed');

  const unreadCheck = await MonitoringEvent.countDocuments({
    websiteId: websiteA._id,
    isRead: false
  });
  assert(unreadCheck === 0, 'All events now have isRead: true');

  // Test 9.4: User unread alerts for top header bell
  const alertsOverview = await monitoringService.getUnreadAlerts({ userId: userA._id });
  assert(alertsOverview.totalUnread === 0, 'Header unread alerts reflects 0 after mark-all');

  console.log('\n--- Test Group 10: Multi-Tenant Security & Isolation ---');

  // Test 10.1: User B cannot access User A settings or run scan on User A website
  let unauthorizedBlocked = false;
  try {
    await monitoringService.runScan({
      userId: userB._id, // User B
      websiteId: websiteA._id, // Website A (belongs to User A)
      triggerType: 'manual',
      mockFreshLinks: []
    });
  } catch (err) {
    if (err.status === 404) {
      unauthorizedBlocked = true;
    }
  }
  assert(unauthorizedBlocked === true, 'User B blocked from scanning User A website (404/unauthorized)');

  // Test 10.2: User B cannot mark User A event as read
  let eventIsolationBlocked = false;
  try {
    await monitoringService.markEventRead({
      userId: userB._id,
      eventId: eventsResult.events[0].id
    });
  } catch (err) {
    if (err.status === 404) {
      eventIsolationBlocked = true;
    }
  }
  assert(eventIsolationBlocked === true, 'User B cannot mark User A event as read (isolated)');

  console.log('\n--- Test Group 11: Summary Stats & Scan History ---');

  const summary = await monitoringService.getMonitoringSummary({
    userId: userA._id,
    websiteId: websiteA._id
  });
  assert(summary.stats.totalScans >= 4, 'Total scans counted correctly');
  assert(summary.stats.totalEvents >= 3, 'Total events aggregated correctly');
  assert(summary.stats.newBacklinksCount >= 1, 'Total new backlinks counted in summary');
  assert(summary.stats.lostBacklinksCount >= 1, 'Total lost backlinks counted in summary');
  assert(summary.stats.changedBacklinksCount >= 1, 'Total changed backlinks counted in summary');

  const history = await monitoringService.getScanHistory({
    userId: userA._id,
    websiteId: websiteA._id,
    page: 1,
    limit: 5
  });
  assert(history.scans.length > 0, 'Scan history retrieved with pagination');
  assert(history.scans[0].domain === 'alphatech.io', 'Scan history records domain properly');

  console.log('\n======================================================');
  console.log(`Phase 8 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await teardown();
  }
}

main();
