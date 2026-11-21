import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Backlink from '../models/Backlink.js';
import Website from '../models/Website.js';
import User from '../models/User.js';
import { backlinkStorageService } from '../services/backlinkStorageService.js';

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
  console.log('\n========================================');
  console.log('   LINKORA Phase 7: Backlink Explorer Tests');
  console.log('========================================\n');

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
    name: 'Tech Blog',
    domain: 'techblog.com',
    url: 'https://techblog.com',
    verificationStatus: 'verified',
    verificationToken: 'token-techblog-123',
    isActive: true
  });

  const websiteB = await Website.create({
    userId: userB._id,
    name: 'Finance Hub',
    domain: 'financehub.com',
    url: 'https://financehub.com',
    verificationStatus: 'verified',
    verificationToken: 'token-financehub-456',
    isActive: true
  });

  // Test 1: Empty Dataset Behavior
  {
    const emptyResult = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(emptyResult.backlinks.length === 0, 'Empty dataset returns 0 backlinks');
    assert(emptyResult.pagination.total === 0, 'Empty dataset reports total 0');

    const emptyStats = await backlinkStorageService.getBacklinkStats({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(emptyStats.totalSavedBacklinks === 0, 'Empty stats reports 0 saved backlinks');
    assert(emptyStats.uniqueReferringDomains === 0, 'Empty stats reports 0 unique domains');

    const emptyAnalysis = await backlinkStorageService.getBacklinkAnalysis({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(emptyAnalysis.hasData === false, 'Empty analysis reports hasData = false');
  }

  // Seed sample backlinks for User A
  const sampleLinks = [
    {
      sourceUrl: 'https://techcrunch.com/2026/01/top-saas-startups',
      targetUrl: 'https://techblog.com/features',
      anchorText: 'leading backlink tool',
      linkType: 'dofollow',
      sourceDomainAuthority: 92,
      sourcePageAuthority: 65,
      provider: 'moz'
    },
    {
      sourceUrl: 'https://wired.com/gear/best-seo-platforms',
      targetUrl: 'https://techblog.com',
      anchorText: 'Linkora platform',
      linkType: 'dofollow',
      sourceDomainAuthority: 88,
      sourcePageAuthority: 58,
      provider: 'moz'
    },
    {
      sourceUrl: 'https://medium.com/@dev/saas-architecture-deepdive',
      targetUrl: 'https://techblog.com/blog/saas',
      anchorText: 'click here for details',
      linkType: 'nofollow',
      sourceDomainAuthority: 75,
      sourcePageAuthority: 42,
      provider: 'moz'
    },
    {
      sourceUrl: 'https://github.com/topics/backlink-management',
      targetUrl: 'https://techblog.com/docs',
      anchorText: 'open source backlink reference',
      linkType: 'nofollow',
      sourceDomainAuthority: 95,
      sourcePageAuthority: 70,
      provider: 'moz'
    },
    {
      sourceUrl: 'https://dev.to/engineer/scaling-express-mongodb',
      targetUrl: 'https://techblog.com',
      anchorText: 'Linkora platform',
      linkType: 'dofollow',
      sourceDomainAuthority: 68,
      sourcePageAuthority: 35,
      provider: 'dataforseo'
    },
    {
      sourceUrl: 'https://hackernews.com/item?id=998877',
      targetUrl: 'https://techblog.com/launch',
      anchorText: 'Linkora launch',
      linkType: 'unknown',
      sourceDomainAuthority: 82,
      sourcePageAuthority: 45,
      provider: 'manual'
    }
  ];

  await backlinkStorageService.saveBacklinks({
    userId: userA._id,
    websiteId: websiteA._id,
    backlinksList: sampleLinks
  });

  // Seed 1 link for User B to test tenant isolation
  await backlinkStorageService.saveBacklinks({
    userId: userB._id,
    websiteId: websiteB._id,
    backlinksList: [
      {
        sourceUrl: 'https://forbes.com/advisor/finance',
        targetUrl: 'https://financehub.com',
        anchorText: 'finance hub',
        linkType: 'dofollow',
        sourceDomainAuthority: 90,
        provider: 'moz'
      }
    ]
  });

  // Test 2: Backlink List Retrieval
  {
    const res = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(res.backlinks.length === 6, 'Retrieves all 6 saved backlinks for User A');
    assert(res.pagination.total === 6, 'Pagination reports total 6');
    assert(res.backlinks[0].sourceDomain !== '', 'Source domain is cleanly extracted and populated');
  }

  // Test 3: Pagination Limit and Pages
  {
    const resPage1 = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      page: 1,
      limit: 2
    });
    assert(resPage1.backlinks.length === 2, 'Limit 2 returns exactly 2 records');
    assert(resPage1.pagination.page === 1, 'Current page is 1');
    assert(resPage1.pagination.totalPages === 3, 'Total pages is 3 for 6 records with limit 2');
    assert(resPage1.pagination.hasNextPage === true, 'hasNextPage is true on page 1');
    assert(resPage1.pagination.hasPrevPage === false, 'hasPrevPage is false on page 1');

    const resPage3 = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      page: 3,
      limit: 2
    });
    assert(resPage3.backlinks.length === 2, 'Page 3 returns 2 records');
    assert(resPage3.pagination.hasNextPage === false, 'hasNextPage is false on last page');
    assert(resPage3.pagination.hasPrevPage === true, 'hasPrevPage is true on page 3');
  }

  // Test 4: Search by Source URL
  {
    const res = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      search: 'techcrunch'
    });
    assert(res.backlinks.length === 1, 'Search "techcrunch" finds 1 record');
    assert(res.backlinks[0].sourceUrl.includes('techcrunch.com'), 'Matching record contains search term');
  }

  // Test 5: Search by Anchor Text
  {
    const res = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      search: 'Linkora platform'
    });
    assert(res.backlinks.length === 2, 'Search "Linkora platform" finds 2 records');
  }

  // Test 6: Search by Source Domain
  {
    const res = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      search: 'wired.com'
    });
    assert(res.backlinks.length === 1, 'Search by source domain "wired.com" finds 1 record');
  }

  // Test 7: Combined Filters (linkType + provider)
  {
    const resDofollow = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      linkType: 'dofollow'
    });
    assert(resDofollow.backlinks.length === 3, 'Filter linkType="dofollow" returns 3 records');

    const resCombined = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      linkType: 'dofollow',
      provider: 'dataforseo'
    });
    assert(resCombined.backlinks.length === 1, 'Combined filter linkType=dofollow & provider=dataforseo returns 1 record');
    assert(resCombined.backlinks[0].provider === 'dataforseo', 'Record provider is dataforseo');
  }

  // Test 8: Sorting by Source DA (Descending and Ascending)
  {
    const resDesc = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      sortBy: 'sourceDomainAuthority',
      sortOrder: 'desc'
    });
    assert(resDesc.backlinks[0].sourceDomainAuthority === 95, 'Sort by DA desc puts DA 95 first');

    const resAsc = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      sortBy: 'sourceDomainAuthority',
      sortOrder: 'asc'
    });
    assert(resAsc.backlinks[0].sourceDomainAuthority === 68, 'Sort by DA asc puts DA 68 first');
  }

  // Test 9: Backlink Detail Retrieval by ID
  {
    const firstLink = (await backlinkStorageService.getSavedBacklinks({ userId: userA._id, websiteId: websiteA._id })).backlinks[0];
    const detail = await backlinkStorageService.getBacklinkById({
      userId: userA._id,
      backlinkId: firstLink.id
    });
    assert(detail.id === firstLink.id, 'getBacklinkById returns exact matching record');
    assert(detail.sourceUrl === firstLink.sourceUrl, 'getBacklinkById returns full sourceUrl');
  }

  // Test 10: Multi-tenant Security Isolation (Cross-User Access Prevention)
  {
    const userALinks = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id
    });
    const linkAId = userALinks.backlinks[0].id;

    // User B tries to view User A's backlink
    let blocked = false;
    try {
      await backlinkStorageService.getBacklinkById({
        userId: userB._id, // User B
        backlinkId: linkAId // Belongs to User A
      });
    } catch (err) {
      blocked = err.status === 404;
    }
    assert(blocked, 'User B is strictly blocked from viewing User A backlink details (404)');

    // User A query never returns User B backlinks
    const userAAll = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id
    });
    const containsUserBData = userAAll.backlinks.some(b => b.sourceDomain.includes('forbes.com'));
    assert(!containsUserBData, 'User A queries never leak User B backlinks');
  }

  // Test 11: Backlink Statistics Aggregation
  {
    const stats = await backlinkStorageService.getBacklinkStats({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(stats.totalSavedBacklinks === 6, 'Stats: totalSavedBacklinks is 6');
    assert(stats.dofollowCount === 3, 'Stats: dofollowCount is 3');
    assert(stats.nofollowCount === 2, 'Stats: nofollowCount is 2');
    assert(stats.otherCount === 1, 'Stats: otherCount (unknown) is 1');
    assert(stats.dofollowRatio === 50, 'Stats: dofollowRatio is 50% (3/6)');
    assert(stats.uniqueReferringDomains === 6, 'Stats: uniqueReferringDomains is 6');
  }

  // Test 12: Backlink Analysis Deep Aggregations
  {
    const analysis = await backlinkStorageService.getBacklinkAnalysis({
      userId: userA._id,
      websiteId: websiteA._id
    });
    assert(analysis.hasData === true, 'Analysis reports hasData = true');
    assert(analysis.topReferringDomains.length > 0, 'Analysis has topReferringDomains');
    assert(analysis.topAnchorTexts.length > 0, 'Analysis has topAnchorTexts');
    assert(analysis.topAnchorTexts[0].anchorText === 'Linkora platform', 'Most frequent anchor text is "Linkora platform"');
    assert(analysis.topAnchorTexts[0].count === 2, 'Top anchor text count is 2');
    assert(analysis.topTargetPages.length > 0, 'Analysis has topTargetPages');
    assert(analysis.domainAuthorityDistribution.length > 0, 'Analysis has domainAuthorityDistribution');
  }

  // Test 13: Invalid Query Parameters & Fallback
  {
    const resFallback = await backlinkStorageService.getSavedBacklinks({
      userId: userA._id,
      websiteId: websiteA._id,
      sortBy: 'hackedField; DROP TABLE',
      page: -10,
      limit: 9999
    });
    assert(resFallback.pagination.page === 1, 'Negative page falls back safely to page 1');
    assert(resFallback.pagination.limit === 100, 'Excessive limit is clamped safely to max 100');
    assert(resFallback.activeFilters.sortBy === 'fetchedAt', 'Unallowed sort field falls back to fetchedAt');
  }

  console.log('\n========================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await teardown();
  }
}

main();
