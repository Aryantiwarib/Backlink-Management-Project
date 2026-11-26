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
import Prospect from '../models/Prospect.js';

import { websiteMetricsService } from '../services/websiteMetricsService.js';
import { dashboardService } from '../services/dashboardService.js';
import { executeAssistantTool } from '../services/assistantTools.js';

async function runDataConsistencyTests() {
  console.log('\n======================================================================');
  console.log('   LINKORA: Critical AI Assistant vs Dashboard Data Consistency Suite ');
  console.log('======================================================================\n');

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
    console.log('--- 1. Seeding Authoritative Test Case (sannacrm.sannainnovations.com) ---');

    // Create primary User and Website
    const userA = await User.create({
      name: 'Sanna Innovations',
      email: 'admin@sannainnovations.com',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Competitor User',
      email: 'competitor@otheragency.com',
      password: 'password123'
    });

    const websiteSanna = await Website.create({
      userId: userA._id,
      name: 'Sanna CRM',
      domain: 'sannacrm.sannainnovations.com',
      url: 'https://sannacrm.sannainnovations.com',
      verificationStatus: 'verified',
      verificationToken: 'token-sanna-123',
      isActive: true
    });

    const websiteSecond = await Website.create({
      userId: userA._id,
      name: 'Sanna Analytics',
      domain: 'analytics.sannainnovations.com',
      url: 'https://analytics.sannainnovations.com',
      verificationStatus: 'verified',
      verificationToken: 'token-analytics-456',
      isActive: false
    });

    const websiteUserB = await Website.create({
      userId: userB._id,
      name: 'Private Client',
      domain: 'privateclient.com',
      url: 'https://privateclient.com',
      verificationStatus: 'verified',
      verificationToken: 'token-b-789',
      isActive: true
    });

    // 2. Seed Authoritative Moz SEO Snapshot matching exact problem description:
    // - Total Backlinks: 5,065
    // - Referring Domains: 188
    // - Moz Domain Authority: 10
    // - Moz Page Authority: 18
    // - Spam Score: 1%
    await SeoSnapshot.create({
      userId: userA._id,
      websiteId: websiteSanna._id,
      domain: websiteSanna.domain,
      provider: 'moz',
      domainAuthority: 10,
      pageAuthority: 18,
      totalBacklinks: 5065,
      referringDomains: 188,
      spamScore: 1,
      snapshotDate: new Date('2026-11-20T10:00:00.000Z')
    });

    // 3. Seed Exactly 50 Saved Granular Backlinks across 26 Distinct Referring Domains
    // With average source DA = 32 and average source PA = 32
    const backlinkSeed = [];
    const domainNames = [];
    for (let i = 1; i <= 26; i++) {
      domainNames.push(`referring-domain-${i}.com`);
    }

    // 50 links distributed across the 26 domains
    // Math: 50 links with sourceDomainAuthority = 32 -> average DA = 32
    // 40 dofollow (80%), 10 nofollow (20%)
    for (let i = 1; i <= 50; i++) {
      const dom = domainNames[(i - 1) % 26];
      const isDofollow = i <= 40;
      const anchor = i <= 20 ? 'crm software platform' : i <= 35 ? 'sanna crm' : 'click here';
      backlinkSeed.push({
        userId: userA._id,
        websiteId: websiteSanna._id,
        sourceUrl: `https://${dom}/article-${i}`,
        sourceDomain: dom,
        targetUrl: 'https://sannacrm.sannainnovations.com/features',
        anchorText: anchor,
        linkType: isDofollow ? 'dofollow' : 'nofollow',
        sourceDomainAuthority: 32,
        sourcePageAuthority: 32,
        fetchedAt: new Date(Date.now() - i * 3600000)
      });
    }
    await Backlink.create(backlinkSeed);

    // 4. Seed Monitoring Events
    // 0 lost backlinks initially (as noted in problem statement)
    // 2 new backlinks
    await MonitoringEvent.create([
      {
        userId: userA._id,
        websiteId: websiteSanna._id,
        eventType: 'new_backlink',
        sourceDomain: 'referring-domain-1.com',
        sourceUrl: 'https://referring-domain-1.com/fresh-review',
        targetUrl: 'https://sannacrm.sannainnovations.com',
        anchorText: 'top rated crm',
        linkType: 'dofollow',
        detectedAt: new Date()
      },
      {
        userId: userA._id,
        websiteId: websiteSanna._id,
        eventType: 'new_backlink',
        sourceDomain: 'referring-domain-2.com',
        sourceUrl: 'https://referring-domain-2.com/saas-roundup',
        targetUrl: 'https://sannacrm.sannainnovations.com',
        anchorText: 'sanna crm platform',
        linkType: 'dofollow',
        detectedAt: new Date()
      }
    ]);

    test(true, 'Test database seeded with sannacrm.sannainnovations.com authoritative state');

    // =========================================================================
    // TEST 1: Dashboard and AI return the exact same Total Backlink count (5,065)
    // =========================================================================
    console.log('\n--- TEST 1 & 2: Total Backlink & Referring Domain Parity ---');
    const dashboardData = await dashboardService.getDashboardData({
      userId: userA._id,
      websiteId: websiteSanna._id
    });

    const aiBacklinkSummary = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: websiteSanna._id.toString() },
      context: { userId: userA._id, websiteId: websiteSanna._id.toString() }
    });

    test(dashboardData.metrics.totalBacklinks.current === 5065, 'Dashboard totalBacklinks is 5,065');
    test(aiBacklinkSummary.totalBacklinks === 5065, 'AI Assistant totalBacklinks is 5,065');
    test(
      dashboardData.metrics.totalBacklinks.current === aiBacklinkSummary.totalBacklinks,
      'MATCH: Dashboard and AI Assistant return identical totalBacklinks count (5,065)'
    );

    // =========================================================================
    // TEST 2: Dashboard and AI return the exact same Referring Domain count (188)
    // =========================================================================
    test(dashboardData.metrics.referringDomains.current === 188, 'Dashboard referringDomains is 188');
    test(aiBacklinkSummary.referringDomains === 188, 'AI Assistant referringDomains is 188');
    test(
      dashboardData.metrics.referringDomains.current === aiBacklinkSummary.referringDomains,
      'MATCH: Dashboard and AI Assistant return identical referringDomains count (188)'
    );

    // =========================================================================
    // TEST 3: Moz DA (10) and PA (18) and Spam Score (1%) labelled & consistent
    // =========================================================================
    console.log('\n--- TEST 3 & 4: Authority Metrics & Labelling Distinction ---');
    test(dashboardData.metrics.domainAuthority.current === 10, 'Dashboard Moz DA is 10');
    test(aiBacklinkSummary.domainAuthority === 10, 'AI Assistant website DA is 10');
    test(aiBacklinkSummary.mozIndexMetrics.domainAuthority === 10, 'AI Moz index domainAuthority is 10');

    test(dashboardData.metrics.pageAuthority.current === 18, 'Dashboard Moz PA is 18');
    test(aiBacklinkSummary.pageAuthority === 18, 'AI Assistant website PA is 18');

    test(dashboardData.metrics.spamScore.current === 1, 'Dashboard Spam Score is 1%');
    test(aiBacklinkSummary.spamScore === 1, 'AI Assistant Spam Score is 1%');

    // =========================================================================
    // TEST 4: Average source DA (32) is NOT confused with website DA (10)
    // =========================================================================
    test(aiBacklinkSummary.domainAuthority !== aiBacklinkSummary.databaseRecords.averageSourceDomainAuthority,
      'Website DA (10) is distinctly separated from average source DA (32)');
    test(aiBacklinkSummary.databaseRecords.averageSourceDomainAuthority === 32,
      'databaseRecords.averageSourceDomainAuthority correctly reports 32');
    test(aiBacklinkSummary.databaseRecords.averageSourcePageAuthority === 32,
      'databaseRecords.averageSourcePageAuthority correctly reports 32');
    test(aiBacklinkSummary.databaseRecords.totalSavedBacklinks === 50,
      'databaseRecords.totalSavedBacklinks correctly reports 50 stored records');
    test(aiBacklinkSummary.databaseRecords.uniqueReferringDomains === 26,
      'databaseRecords.uniqueReferringDomains correctly reports 26 distinct referring domains');
    test(dashboardData.linkAttributes.total === 50,
      'Dashboard linkAttributes.total matches 50 stored records');
    test(
      dashboardData.linkAttributes.total === aiBacklinkSummary.databaseRecords.totalSavedBacklinks,
      'MATCH: Dashboard and AI return identical stored backlink count (50)'
    );

    // =========================================================================
    // TEST 5: Anchor text counts match underlying records
    // =========================================================================
    console.log('\n--- TEST 5: Anchor Text Distribution ---');
    test(Array.isArray(aiBacklinkSummary.topAnchorTexts), 'topAnchorTexts is an array');
    const topAnchor = aiBacklinkSummary.topAnchorTexts[0];
    test(topAnchor.anchorText === 'crm software platform', 'Top anchor is "crm software platform"');
    test(topAnchor.occurrences === 20, `Top anchor occurrences is 20 (found ${topAnchor.occurrences})`);
    test(topAnchor.percentage === 40, `Top anchor percentage is 40% of 50 links (found ${topAnchor.percentage}%)`);

    // =========================================================================
    // TEST 6: Lost backlink count matches monitoring records
    // =========================================================================
    console.log('\n--- TEST 6: Lost Backlink Monitoring Parity ---');
    const lostLinksResult = await executeAssistantTool({
      name: 'getLostBacklinks',
      args: { websiteId: websiteSanna._id.toString() },
      context: { userId: userA._id, websiteId: websiteSanna._id.toString() }
    });
    test(lostLinksResult.success === true, 'getLostBacklinks returns success');
    test(lostLinksResult.lostBacklinksDetected === 0, 'Lost backlinks detected is 0 (matching problem statement)');
    test(lostLinksResult.lostBacklinks.length === 0, 'Lost backlinks array is empty');

    // =========================================================================
    // TEST 7: New backlink records match selected reporting period
    // =========================================================================
    console.log('\n--- TEST 7: New Backlink Records ---');
    const newLinksResult = await executeAssistantTool({
      name: 'getNewBacklinks',
      args: { websiteId: websiteSanna._id.toString(), limit: 5 },
      context: { userId: userA._id, websiteId: websiteSanna._id.toString() }
    });
    test(newLinksResult.success === true, 'getNewBacklinks returns success');
    test(newLinksResult.count === 2, `getNewBacklinks retrieved 2 monitoring events (found ${newLinksResult.count})`);
    const newDomains = newLinksResult.newBacklinks.map((b) => b.sourceDomain);
    test(
      newDomains.includes('referring-domain-1.com') && newDomains.includes('referring-domain-2.com'),
      'New backlink source domains match expected monitoring records'
    );

    // =========================================================================
    // TEST 8: Switching websites returns the correct data
    // =========================================================================
    console.log('\n--- TEST 8: Switching Websites Context ---');
    const secondSiteSummary = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: websiteSecond._id.toString() },
      context: { userId: userA._id, websiteId: websiteSecond._id.toString() }
    });
    test(secondSiteSummary.domain === 'analytics.sannainnovations.com', 'Switched to analytics.sannainnovations.com');
    test(secondSiteSummary.totalBacklinks === 0, 'Second website with no data returns 0 totalBacklinks');
    test(secondSiteSummary.referringDomains === 0, 'Second website returns 0 referringDomains');
    test(secondSiteSummary.domainAuthority === null, 'Second website returns null domainAuthority');

    // By domain name candidate resolution
    const byDomainSummary = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: 'sannacrm.sannainnovations.com' },
      context: { userId: userA._id }
    });
    test(byDomainSummary.totalBacklinks === 5065, 'Resolving by domain string returns correct 5,065 backlinks');

    // =========================================================================
    // TEST 9: Multi-tenant security: Users cannot access one another's data
    // =========================================================================
    console.log('\n--- TEST 9: Multi-Tenant Authorization Security ---');
    const crossTenantAttempt = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: websiteUserB._id.toString() },
      context: { userId: userA._id, websiteId: websiteSanna._id.toString() }
    });
    test(
      crossTenantAttempt.success === false || crossTenantAttempt.domain !== 'privateclient.com',
      'User A cannot access User B private website'
    );

    const userBQuery = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: websiteSanna._id.toString() },
      context: { userId: userB._id }
    });
    test(
      userBQuery.success === false || userBQuery.domain !== 'sannacrm.sannainnovations.com',
      'User B cannot access User A sannacrm website'
    );

    // =========================================================================
    // TEST 10: Missing provider data does not result in fabricated values
    // =========================================================================
    console.log('\n--- TEST 10: Missing Provider Data Graceful Fallback ---');
    // websiteSecond has zero snapshots and zero backlinks
    const emptyMetrics = await websiteMetricsService.getWebsiteAuthorityMetrics({
      userId: userA._id,
      websiteId: websiteSecond._id
    });
    test(emptyMetrics.hasData === false, 'Missing snapshot correctly reports hasData: false');
    test(emptyMetrics.domainAuthority === undefined || emptyMetrics.domainAuthority === null,
      'Missing snapshot does NOT fabricate domainAuthority');

    // =========================================================================
    // TEST 11: Data Provenance & Dashboard Consistency Validation
    // =========================================================================
    console.log('\n--- TEST 11: Data Provenance & Consistency Validation ---');
    test(Boolean(aiBacklinkSummary.provenance), 'Provenance metadata exists in tool output');
    test(aiBacklinkSummary.provenance.websiteId === websiteSanna._id.toString(), 'Provenance contains valid websiteId');
    test(aiBacklinkSummary.provenance.domain === 'sannacrm.sannainnovations.com', 'Provenance contains domain');
    test(Array.isArray(aiBacklinkSummary.provenance.sources), 'Provenance lists sources array');
    test(
      aiBacklinkSummary.provenance.consistencyValidation.matchesDashboard === true,
      'Validation confirms matchesDashboard === true'
    );
    test(
      aiBacklinkSummary.provenance.consistencyValidation.dashboardTotalBacklinks === 5065,
      'Validation confirms dashboardTotalBacklinks === 5065'
    );
    test(
      aiBacklinkSummary.provenance.consistencyValidation.dashboardIndexedBacklinks === 50,
      'Validation confirms dashboardIndexedBacklinks === 50'
    );

    // =========================================================================
    // TEST 12: Website Overview Tool Consistency
    // =========================================================================
    console.log('\n--- TEST 12: Website Overview Tool Parity ---');
    const overviewResult = await executeAssistantTool({
      name: 'getWebsiteOverview',
      args: { websiteId: websiteSanna._id.toString() },
      context: { userId: userA._id, websiteId: websiteSanna._id.toString() }
    });
    test(overviewResult.success === true, 'getWebsiteOverview returns success');
    test(overviewResult.seoMetrics.domainAuthority === 10, 'Overview seoMetrics.domainAuthority is 10');
    test(overviewResult.seoMetrics.pageAuthority === 18, 'Overview seoMetrics.pageAuthority is 18');
    test(overviewResult.seoMetrics.totalExternalBacklinksMoz === 5065, 'Overview totalExternalBacklinksMoz is 5065');
    test(overviewResult.seoMetrics.referringDomainsMoz === 188, 'Overview referringDomainsMoz is 188');
    test(overviewResult.databaseSummary.savedBacklinks === 50, 'Overview databaseSummary.savedBacklinks is 50');
    test(overviewResult.databaseSummary.uniqueReferringDomains === 26, 'Overview uniqueReferringDomains is 26');

    console.log(`\n======================================================`);
    console.log(`   Data Consistency Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runDataConsistencyTests();
