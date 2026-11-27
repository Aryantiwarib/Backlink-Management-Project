import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import Backlink from '../models/Backlink.js';
import { createAuthToken } from '../utils/tokenHelper.js';

async function runRouteTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 13: Analytics HTTP Route Tests       ');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SESSION_SECRET = 'test-analytics-secret-12345';
  process.env.PORT = '0';

  const { default: app } = await import('../app.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

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
    const userA = await User.create({
      name: 'Route Tester A',
      email: 'tester-a@linkora.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Route Tester B',
      email: 'tester-b@linkora.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'Site A',
      domain: 'site-a.io',
      url: 'https://site-a.io',
      verificationStatus: 'verified',
      verificationToken: 'token-site-a',
      isActive: true
    });

    await SeoSnapshot.create({
      userId: userA._id,
      websiteId: websiteA._id,
      domain: websiteA.domain,
      domainAuthority: 35,
      pageAuthority: 28,
      totalBacklinks: 500,
      referringDomains: 80,
      spamScore: 1
    });

    await Backlink.create({
      userId: userA._id,
      websiteId: websiteA._id,
      sourceUrl: 'https://source.com/page',
      sourceDomain: 'source.com',
      targetUrl: 'https://site-a.io',
      anchorText: 'site a link',
      linkType: 'dofollow',
      sourceDomainAuthority: 50
    });

    const tokenA = createAuthToken(userA);
    const tokenB = createAuthToken(userB);

    // 1. Unauthenticated request to /api/analytics/overview returns 401
    const unauthRes = await fetch(`${baseUrl}/api/analytics/overview`);
    test(unauthRes.status === 401, '1. Unauthenticated GET /api/analytics/overview returns 401');

    // 2. Authenticated GET /api/analytics/overview
    const overviewRes = await fetch(`${baseUrl}/api/analytics/overview?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const overviewBody = await overviewRes.json();
    test(overviewRes.status === 200, '2. Authenticated GET /api/analytics/overview returns 200');
    test(overviewBody.kpis.totalBacklinks.current === 500, 'Overview contains totalBacklinks 500');

    // 3. Authenticated GET /api/analytics/backlinks
    const backlinksRes = await fetch(`${baseUrl}/api/analytics/backlinks?websiteId=${websiteA._id}&range=30d`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const backlinksBody = await backlinksRes.json();
    test(backlinksRes.status === 200, '3. Authenticated GET /api/analytics/backlinks returns 200');
    test(Array.isArray(backlinksBody.linkTypeDistribution), 'Backlinks response contains linkTypeDistribution');

    // 4. Authenticated GET /api/analytics/campaigns
    const campaignsRes = await fetch(`${baseUrl}/api/analytics/campaigns?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const campaignsBody = await campaignsRes.json();
    test(campaignsRes.status === 200, '4. Authenticated GET /api/analytics/campaigns returns 200');
    test(campaignsBody.statusCounts !== undefined, 'Campaigns response contains statusCounts');

    // 5. Authenticated GET /api/analytics/prospects
    const prospectsRes = await fetch(`${baseUrl}/api/analytics/prospects?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const prospectsBody = await prospectsRes.json();
    test(prospectsRes.status === 200, '5. Authenticated GET /api/analytics/prospects returns 200');
    test(prospectsBody.qualificationStatus !== undefined, 'Prospects response contains qualificationStatus');

    // 6. Authenticated GET /api/analytics/outreach
    const outreachRes = await fetch(`${baseUrl}/api/analytics/outreach?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const outreachBody = await outreachRes.json();
    test(outreachRes.status === 200, '6. Authenticated GET /api/analytics/outreach returns 200');
    test(outreachBody.overview !== undefined, 'Outreach response contains overview');

    // 7. Authenticated GET /api/analytics/insights
    const insightsRes = await fetch(`${baseUrl}/api/analytics/insights?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const insightsBody = await insightsRes.json();
    test(insightsRes.status === 200, '7. Authenticated GET /api/analytics/insights returns 200');
    test(Array.isArray(insightsBody.insights), 'Insights response contains insights array');

    // 8. Authenticated GET /api/analytics/report
    const reportRes = await fetch(`${baseUrl}/api/analytics/report?websiteId=${websiteA._id}&range=30d`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const reportBody = await reportRes.json();
    test(reportRes.status === 200, '8. Authenticated GET /api/analytics/report returns 200');
    test(reportBody.meta.websiteName === 'Site A', 'Report response contains correct meta');

    // 9. Authenticated GET /api/analytics/export/csv
    const csvRes = await fetch(`${baseUrl}/api/analytics/export/csv?websiteId=${websiteA._id}&range=30d`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const csvText = await csvRes.text();
    test(csvRes.status === 200, '9. Authenticated GET /api/analytics/export/csv returns 200');
    test(csvRes.headers.get('content-type').includes('text/csv'), 'Export response Content-Type is text/csv');
    test(csvText.includes('LINKORA EXECUTIVE SEO & BACKLINK PERFORMANCE REPORT'), 'CSV contains header text');

    // 10. Multi-tenant security: User B querying User A website returns 404
    const crossRes = await fetch(`${baseUrl}/api/analytics/overview?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    test(crossRes.status === 404, '10. Cross-tenant GET returns 404/Access Denied for other users');

    console.log(`\n======================================================`);
    console.log(`   Route Tests: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Route test error:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runRouteTests();
