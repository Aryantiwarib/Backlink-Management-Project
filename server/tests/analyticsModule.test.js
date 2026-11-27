import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringScan from '../models/MonitoringScan.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import Prospect from '../models/Prospect.js';
import OutreachEmail from '../models/OutreachEmail.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';

import {
  analyticsService,
  parseDateRange,
  calculateComparison
} from '../services/analyticsService.js';

async function runAnalyticsTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 13: Reports & Analytics Test Suite   ');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  let passed = 0;
  let failed = 0;

  function test(condition, name) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.error(`  FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Test Date Range Parsing and Comparison Utility Math
    // -------------------------------------------------------------------------
    console.log('--- 1. Date Range & Comparison Math ---');

    const range30 = parseDateRange('30d');
    test(range30.rangeLabel === '30d', 'parseDateRange(30d) returns rangeLabel 30d');
    test(range30.current.startDate < range30.current.endDate, 'Current startDate is before endDate');
    test(range30.previous.startDate < range30.previous.endDate, 'Previous startDate is before endDate');
    test(range30.previous.endDate.getTime() === range30.current.startDate.getTime(), 'Previous period directly precedes current period');

    const range7 = parseDateRange('7d');
    const diffDays7 = Math.round((range7.current.endDate - range7.current.startDate) / (1000 * 60 * 60 * 24));
    test(diffDays7 === 7, `parseDateRange(7d) duration is 7 days (found ${diffDays7})`);

    // Comparison math with valid previous value
    const compValid = calculateComparison(150, 100);
    test(compValid.percentChange === 50, 'calculateComparison(150, 100) returns +50%');
    test(compValid.absoluteChange === 50, 'calculateComparison(150, 100) returns absolute +50');
    test(compValid.hasComparison === true, 'hasComparison is true when previous > 0');

    // Comparison math when previous value is ZERO (Crucial Requirement: No divide-by-zero bogus % change)
    const compZeroPrev = calculateComparison(25, 0);
    test(compZeroPrev.percentChange === null, 'calculateComparison(25, 0) returns null percentChange (no bogus infinite %)');
    test(compZeroPrev.hasComparison === false, 'hasComparison is false when previous value is 0');
    test(compZeroPrev.absoluteChange === 25, 'absoluteChange is correctly 25 when previous is 0');

    // Comparison math when previous is null (First record)
    const compFirstRecord = calculateComparison(100, null);
    test(compFirstRecord.hasComparison === false, 'hasComparison is false when previous is null');
    test(compFirstRecord.status === 'first_record', 'status is first_record when previous is null');

    // -------------------------------------------------------------------------
    // 2. Multi-Tenant Test Data Seeding
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Seeding Analytics Database Records ---');

    const userA = await User.create({
      name: 'Analytics User A',
      email: 'user-a@analytics.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Analytics User B',
      email: 'user-b@analytics.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'Tech Growth Platform',
      domain: 'techgrowth.io',
      url: 'https://techgrowth.io',
      verificationStatus: 'verified',
      verificationToken: 'token-a-123',
      isActive: true
    });

    const websiteEmpty = await Website.create({
      userId: userA._id,
      name: 'Fresh New Site',
      domain: 'freshnewsite.io',
      url: 'https://freshnewsite.io',
      verificationStatus: 'verified',
      verificationToken: 'token-empty-123',
      isActive: false
    });

    const websiteB = await Website.create({
      userId: userB._id,
      name: 'Competitor Platform',
      domain: 'competitor.io',
      url: 'https://competitor.io',
      verificationStatus: 'verified',
      verificationToken: 'token-b-123',
      isActive: true
    });

    // Seed SEO Snapshots for websiteA (Timeline: current snapshot and previous period snapshot)
    const now = Date.now();
    await SeoSnapshot.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        domain: websiteA.domain,
        domainAuthority: 42,
        pageAuthority: 35,
        totalBacklinks: 1200,
        referringDomains: 150,
        spamScore: 2,
        snapshotDate: new Date(now - 45 * 24 * 60 * 60 * 1000) // Previous period (45 days ago)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        domain: websiteA.domain,
        domainAuthority: 45,
        pageAuthority: 38,
        totalBacklinks: 1450,
        referringDomains: 180,
        spamScore: 1,
        snapshotDate: new Date(now - 5 * 24 * 60 * 60 * 1000) // Current period (5 days ago)
      }
    ]);

    // Seed Backlinks for websiteA
    await Backlink.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://techradar.com/article1',
        sourceDomain: 'techradar.com',
        targetUrl: 'https://techgrowth.io/product',
        anchorText: 'best saas platform',
        linkType: 'dofollow',
        sourceDomainAuthority: 82,
        status: 'active',
        fetchedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://venturebeat.com/article2',
        sourceDomain: 'venturebeat.com',
        targetUrl: 'https://techgrowth.io/ai',
        anchorText: 'best saas platform',
        linkType: 'dofollow',
        sourceDomainAuthority: 78,
        status: 'active',
        fetchedAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://medium.com/@dev/post',
        sourceDomain: 'medium.com',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'techgrowth software',
        linkType: 'nofollow',
        sourceDomainAuthority: 90,
        status: 'active',
        fetchedAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://oldblog.com/mention',
        sourceDomain: 'oldblog.com',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'click here',
        linkType: 'nofollow',
        sourceDomainAuthority: 25,
        status: 'lost',
        fetchedAt: new Date(now - 20 * 24 * 60 * 60 * 1000)
      }
    ]);

    // Seed Monitoring Events (Current period: 3 new, 1 lost; Previous period: 1 new, 2 lost)
    await MonitoringEvent.create([
      // Current Period (within last 30 days)
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'new_backlink',
        sourceDomain: 'techradar.com',
        sourceUrl: 'https://techradar.com/article1',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'best saas platform',
        detectedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'new_backlink',
        sourceDomain: 'venturebeat.com',
        sourceUrl: 'https://venturebeat.com/article2',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'best saas platform',
        detectedAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'new_backlink',
        sourceDomain: 'medium.com',
        sourceUrl: 'https://medium.com/@dev/post',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'techgrowth software',
        detectedAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'lost_backlink',
        sourceDomain: 'oldblog.com',
        sourceUrl: 'https://oldblog.com/mention',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'click here',
        detectedAt: new Date(now - 8 * 24 * 60 * 60 * 1000)
      },
      // Previous Period (between 30 and 60 days ago)
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'new_backlink',
        sourceDomain: 'pastdomain.com',
        sourceUrl: 'https://pastdomain.com/link',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'growth tool',
        detectedAt: new Date(now - 40 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'lost_backlink',
        sourceDomain: 'dropped1.com',
        sourceUrl: 'https://dropped1.com/link',
        targetUrl: 'https://techgrowth.io',
        detectedAt: new Date(now - 42 * 24 * 60 * 60 * 1000)
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'lost_backlink',
        sourceDomain: 'dropped2.com',
        sourceUrl: 'https://dropped2.com/link',
        targetUrl: 'https://techgrowth.io',
        detectedAt: new Date(now - 45 * 24 * 60 * 60 * 1000)
      }
    ]);

    // Seed Campaigns & Assignments
    const camp1 = await Campaign.create({
      userId: userA._id,
      websiteId: websiteA._id,
      name: 'Q4 Tech Outreach',
      campaignType: 'Guest Posting',
      status: 'active',
      targetBacklinks: 10,
      metrics: { totalAssigned: 5, acquiredCount: 2, progressPercentage: 20 },
      createdAt: new Date(now - 25 * 24 * 60 * 60 * 1000)
    });

    const camp2 = await Campaign.create({
      userId: userA._id,
      websiteId: websiteA._id,
      name: 'Directory Submissions',
      campaignType: 'Directory Submission',
      status: 'completed',
      targetBacklinks: 5,
      metrics: { totalAssigned: 5, acquiredCount: 5, progressPercentage: 100 },
      createdAt: new Date(now - 50 * 24 * 60 * 60 * 1000)
    });

    // Seed Prospects
    const p1 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'techradar.com',
      prospectUrl: 'https://techradar.com/write-for-us',
      opportunityScore: 88,
      qualificationStatus: 'qualified',
      contactEmail: 'editor@techradar.com',
      contactStatus: 'found',
      source: 'competitor',
      createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000)
    });

    const p2 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'venturebeat.com',
      prospectUrl: 'https://venturebeat.com/pitches',
      opportunityScore: 75,
      qualificationStatus: 'qualified',
      contactEmail: 'press@venturebeat.com',
      contactStatus: 'found',
      source: 'keyword',
      createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000)
    });

    const p3 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'randomblog.net',
      prospectUrl: 'https://randomblog.net/contact',
      opportunityScore: 35,
      qualificationStatus: 'rejected',
      contactStatus: 'not_found',
      source: 'keyword',
      createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000)
    });

    // Assign p1 and p2 to camp1
    await CampaignProspectAssignment.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: p1._id,
        outreachStatus: 'link_acquired'
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: p2._id,
        outreachStatus: 'contacted'
      }
    ]);

    // Seed Connected Account & Outreach Email
    const connAcc = await ConnectedEmailAccount.create({
      userId: userA._id,
      email: 'outreach@techgrowth.io',
      status: 'connected',
      provider: 'gmail'
    });

    await OutreachEmail.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: camp1._id,
      prospectId: p1._id,
      connectedAccountId: connAcc._id,
      recipientEmail: 'editor@techradar.com',
      senderEmail: 'outreach@techgrowth.io',
      subject: 'Guest post pitch',
      bodyHtml: '<p>Pitch</p>',
      status: 'sent',
      sentAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      openCount: 1
    });

    await ScheduledFollowUp.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: camp1._id,
      prospectId: p2._id,
      assignmentId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
      status: 'scheduled'
    });

    test(true, 'Analytics test records seeded successfully');

    // -------------------------------------------------------------------------
    // 3. Test Analytics Overview & 8 KPIs
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Analytics Overview & 8 KPIs ---');

    const overview = await analyticsService.getOverviewAnalytics({
      userId: userA._id,
      websiteId: websiteA._id.toString(),
      dateRange: '30d'
    });

    test(overview.success === true, 'getOverviewAnalytics returns success');
    test(overview.website.domain === 'techgrowth.io', 'Overview website domain matches');

    // Total Backlinks: latest snapshot 1,450 vs previous 1,200 (+20.8%)
    test(overview.kpis.totalBacklinks.current === 1450, 'Total backlinks current is 1,450');
    test(overview.kpis.totalBacklinks.previous === 1200, 'Total backlinks previous period was 1,200');
    test(overview.kpis.totalBacklinks.percentChange === 20.8, 'Total backlinks percent change is +20.8%');

    // Domain Authority: 45 vs 42 (+3 points)
    test(overview.kpis.domainAuthority.current === 45, 'Domain Authority current is 45');
    test(overview.kpis.domainAuthority.previous === 42, 'Domain Authority previous was 42');
    test(overview.kpis.domainAuthority.absoluteChange === 3, 'Domain Authority absolute change is +3');

    // New Backlinks in 30d window: 3 vs previous 1 (+200%)
    test(overview.kpis.newBacklinks.current === 3, 'New backlinks in current period is 3');
    test(overview.kpis.newBacklinks.previous === 1, 'New backlinks in previous period was 1');
    test(overview.kpis.newBacklinks.percentChange === 200, 'New backlinks percent change is +200%');

    // Lost Backlinks in 30d window: 1 vs previous 2 (-50%)
    test(overview.kpis.lostBacklinks.current === 1, 'Lost backlinks in current period is 1');
    test(overview.kpis.lostBacklinks.previous === 2, 'Lost backlinks in previous period was 2');
    test(overview.kpis.lostBacklinks.percentChange === -50, 'Lost backlinks percent change is -50%');

    // Net Backlink Growth: 3 new - 1 lost = +2 net links
    test(overview.netBacklinks.current === 2, 'Net backlink growth in current period is +2 (3 - 1)');
    test(overview.netBacklinks.previous === -1, 'Net backlink growth in previous period was -1 (1 - 2)');
    test(overview.netBacklinks.change === 3, 'Net backlink shift is +3 (+2 - (-1))');

    // Qualified Prospects: 2
    test(overview.kpis.qualifiedProspects.current === 2, 'Qualified prospects count is 2');

    // Active Campaigns: 1
    test(overview.kpis.activeCampaigns.current === 1, 'Active campaigns count is 1');

    // -------------------------------------------------------------------------
    // 4. Test Backlink Growth Analytics
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Backlink Growth Analytics ---');

    const backlinkAnalytics = await analyticsService.getBacklinkAnalytics({
      userId: userA._id,
      websiteId: websiteA._id.toString(),
      dateRange: '30d'
    });

    test(backlinkAnalytics.success === true, 'getBacklinkAnalytics returns success');
    test(backlinkAnalytics.totalSavedBacklinks === 4, 'Total saved backlink records is 4');

    // Dofollow distribution: 2 dofollow (50%), 2 nofollow (50%)
    const dofollowEntry = backlinkAnalytics.linkTypeDistribution.find((l) => l.type === 'dofollow');
    test(dofollowEntry.count === 2, 'Dofollow count is 2');
    test(dofollowEntry.percentage === 50, 'Dofollow ratio is 50%');

    // Status distribution: 3 active (75%), 1 lost (25%)
    const activeStatusEntry = backlinkAnalytics.statusDistribution.find((s) => s.status === 'active');
    test(activeStatusEntry.count === 3, 'Active backlinks count is 3');

    // Anchor text distribution
    const topAnchor = backlinkAnalytics.anchorTextDistribution[0];
    test(topAnchor.anchorText === 'best saas platform', 'Top anchor text is "best saas platform"');
    test(topAnchor.count === 2, 'Top anchor occurrences is 2');
    test(topAnchor.percentage === 50, 'Top anchor percentage is 50%');

    // Domain Authority Tiers
    test(Array.isArray(backlinkAnalytics.authorityDistribution), 'authorityDistribution is an array');
    const highTier = backlinkAnalytics.authorityDistribution.find((t) => t.minDa === 81);
    test(highTier.count === 2, `Tier 81-100 contains 2 backlinks with DA >= 81 (found ${highTier.count})`);

    // -------------------------------------------------------------------------
    // 5. Test Campaign Performance Analytics
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Campaign Performance Analytics ---');

    const campaignAnalytics = await analyticsService.getCampaignAnalytics({
      userId: userA._id,
      websiteId: websiteA._id.toString()
    });

    test(campaignAnalytics.success === true, 'getCampaignAnalytics returns success');
    test(campaignAnalytics.statusCounts.active === 1, '1 active campaign');
    test(campaignAnalytics.statusCounts.completed === 1, '1 completed campaign');
    test(campaignAnalytics.statusCounts.total === 2, 'Total 2 campaigns');
    test(campaignAnalytics.topPerforming.length > 0, 'Top performing campaigns list populated');

    // Campaign 1 Pipeline details
    const camp1Stats = campaignAnalytics.campaigns.find((c) => c.name === 'Q4 Tech Outreach');
    test(camp1Stats.pipeline.link_acquired === 1, 'Camp 1 pipeline has 1 link_acquired');
    test(camp1Stats.pipeline.contacted === 1, 'Camp 1 pipeline has 1 contacted');
    test(camp1Stats.assignedProspects === 2, 'Camp 1 has 2 assigned prospects');

    // -------------------------------------------------------------------------
    // 6. Test Prospecting Analytics
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Prospecting Analytics ---');

    const prospectAnalytics = await analyticsService.getProspectAnalytics({
      userId: userA._id,
      websiteId: websiteA._id.toString()
    });

    test(prospectAnalytics.success === true, 'getProspectAnalytics returns success');
    test(prospectAnalytics.totalProspects === 3, 'Total prospects is 3');
    test(prospectAnalytics.qualificationStatus.qualified === 2, '2 qualified prospects');
    test(prospectAnalytics.qualificationStatus.rejected === 1, '1 rejected prospect');
    test(prospectAnalytics.contactDiscovery.emailsFound === 2, '2 contact emails found');
    test(prospectAnalytics.contactDiscovery.contactDiscoveryRate === 66.7, 'Contact discovery rate is 66.7%');

    // -------------------------------------------------------------------------
    // 7. Test Outreach Analytics
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Outreach Analytics ---');

    const outreachAnalytics = await analyticsService.getOutreachAnalytics({
      userId: userA._id,
      websiteId: websiteA._id.toString()
    });

    test(outreachAnalytics.success === true, 'getOutreachAnalytics returns success');
    test(outreachAnalytics.overview.sent === 1, 'Emails sent count is 1');
    test(outreachAnalytics.overview.scheduledFollowUps === 1, 'Scheduled follow-ups count is 1');
    test(outreachAnalytics.realEngagementTracking.totalTrackedOpens === 1, 'Verified open count is 1');
    test(outreachAnalytics.campaignBreakdown.length > 0, 'Campaign outreach breakdown populated');

    // -------------------------------------------------------------------------
    // 8. Test Deterministic SEO Performance Insights
    // -------------------------------------------------------------------------
    console.log('\n--- 8. SEO Performance Insights ---');

    const insightsResult = await analyticsService.getSeoInsights({
      userId: userA._id,
      websiteId: websiteA._id.toString()
    });

    test(insightsResult.success === true, 'getSeoInsights returns success');
    test(insightsResult.totalInsights > 0, `Generated ${insightsResult.totalInsights} deterministic insights`);

    const growthInsight = insightsResult.insights.find((i) => i.type === 'growth');
    test(growthInsight !== undefined, 'Found positive net backlink growth insight');
    test(growthInsight.metric.includes('Net Links'), 'Insight includes observed metric');
    test(Boolean(growthInsight.whyItMatters), 'Insight explains why it matters');
    test(Boolean(growthInsight.suggestedNextStep), 'Insight includes actionable next step');

    // -------------------------------------------------------------------------
    // 9. Test Executive Report Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Executive Report Generation ---');

    const report = await analyticsService.generateReportData({
      userId: userA._id,
      websiteId: websiteA._id.toString(),
      dateRange: '30d'
    });

    test(report.success === true, 'generateReportData returns success');
    test(report.meta.websiteName === 'Tech Growth Platform', 'Report meta website name matches');
    test(report.executiveSummary.totalBacklinks === 1450, 'Report executiveSummary totalBacklinks is 1450');
    test(report.executiveSummary.domainAuthority === 45, 'Report executiveSummary domainAuthority is 45');
    test(report.kpis.domainAuthority.current === 45, 'Report kpis table domainAuthority matches');
    test(Array.isArray(report.recommendations), 'Report contains recommendations array');

    // -------------------------------------------------------------------------
    // 10. Empty Datasets & Graceful Handling (Zero Fabrication)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Empty Datasets & Zero Fabrication ---');

    const emptyOverview = await analyticsService.getOverviewAnalytics({
      userId: userA._id,
      websiteId: websiteEmpty._id.toString(),
      dateRange: '30d'
    });

    test(emptyOverview.success === true, 'Empty website returns success without errors');
    test(emptyOverview.kpis.totalBacklinks.current === 0, 'Empty site totalBacklinks is 0 (not fabricated)');
    test(emptyOverview.kpis.domainAuthority.current === null, 'Empty site DA is null (not fabricated)');
    test(emptyOverview.netBacklinks.current === 0, 'Empty site net growth is 0');

    const emptyBacklinks = await analyticsService.getBacklinkAnalytics({
      userId: userA._id,
      websiteId: websiteEmpty._id.toString(),
      dateRange: '30d'
    });

    test(emptyBacklinks.hasGrowthTrend === false, 'hasGrowthTrend is false when no snapshots exist');
    test(emptyBacklinks.growthTrend.length === 0, 'growthTrend array is empty (no fake chart data)');

    // -------------------------------------------------------------------------
    // 11. Multi-Tenant User Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Multi-Tenant User Isolation ---');

    try {
      await analyticsService.getOverviewAnalytics({
        userId: userB._id, // User B trying to access User A's website
        websiteId: websiteA._id.toString()
      });
      test(false, 'Cross-tenant access should have thrown an error');
    } catch (err) {
      test(true, 'User B is blocked from querying User A website analytics (Access denied)');
    }

    console.log(`\n======================================================`);
    console.log(`   Analytics Test Suite: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runAnalyticsTests();
