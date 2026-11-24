import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Backlink from '../models/Backlink.js';
import Website from '../models/Website.js';
import User from '../models/User.js';
import { mozProvider, normalizeDomain } from '../services/seo/mozProvider.js';
import { backlinkStorageService } from '../services/backlinkStorageService.js';

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB for Moz Sync Tests');
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Disconnected and stopped In-Memory MongoDB');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA: Moz Backlink Sync & Normalization Tests');
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

  // 1. Test normalizeDomain helper
  {
    assert(normalizeDomain('growthlabs.io') === 'growthlabs.io', 'normalizeDomain bare domain');
    assert(normalizeDomain('https://growthlabs.io') === 'growthlabs.io', 'normalizeDomain strips https://');
    assert(normalizeDomain('http://www.growthlabs.io/') === 'growthlabs.io', 'normalizeDomain strips http://www. and trailing slash');
    assert(normalizeDomain('https://WWW.EXAMPLE.COM/path/to/page?utm=1#hash') === 'example.com', 'normalizeDomain complex URL');
    assert(normalizeDomain('') === '', 'normalizeDomain empty string returns empty');
    assert(normalizeDomain(null) === '', 'normalizeDomain null returns empty');
  }

  // 2. Test nested Moz API v2 response normalization
  {
    const mockMozResponse = {
      results: [
        {
          source: {
            page: 'techcrunch.com/2026/01/growth-innovations',
            subdomain: 'techcrunch.com',
            root_domain: 'techcrunch.com',
            title: 'Top SaaS Growth Innovations 2026',
            page_authority: 45,
            domain_authority: 92,
            spam_score: 1
          },
          target: {
            page: 'growthlabs.io/features',
            subdomain: 'growthlabs.io',
            root_domain: 'growthlabs.io'
          },
          anchor_text: 'GrowthLabs platform',
          date_first_seen: '2026-02-15',
          date_last_seen: '2026-10-20',
          nofollow: false,
          redirect: false,
          rel_canonical: false
        },
        {
          source: {
            page: 'reddit.com/r/startups/comments/growth_tools',
            subdomain: 'reddit.com',
            root_domain: 'reddit.com',
            title: 'Favorite growth tools?',
            page_authority: 30,
            domain_authority: 90,
            spam_score: 2
          },
          target: {
            page: 'growthlabs.io/',
            subdomain: 'growthlabs.io',
            root_domain: 'growthlabs.io'
          },
          anchor_text: 'https://growthlabs.io',
          date_first_seen: '2026-04-01',
          date_last_seen: '2026-09-12',
          nofollow: true,
          redirect: false,
          rel_canonical: false
        },
        // Incomplete record: missing source page and root domain
        {
          source: {},
          target: { page: 'growthlabs.io/' },
          anchor_text: 'orphan'
        }
      ]
    };

    const normalized = mozProvider.normalizeLinksResponse('growthlabs.io', mockMozResponse);

    assert(normalized.length === 2, 'Incomplete/empty source records filtered out (2 valid of 3)');
    
    // Check record 1 (dofollow)
    const rec1 = normalized[0];
    assert(rec1.sourceUrl === 'https://techcrunch.com/2026/01/growth-innovations', 'Record 1 sourceUrl formatted with https://');
    assert(rec1.targetUrl === 'https://growthlabs.io/features', 'Record 1 targetUrl formatted with https://');
    assert(rec1.sourceDomain === 'techcrunch.com', 'Record 1 sourceDomain correctly mapped');
    assert(rec1.sourceDomainAuthority === 92, 'Record 1 DA mapped from source.domain_authority (92)');
    assert(rec1.sourcePageAuthority === 45, 'Record 1 PA mapped from source.page_authority (45)');
    assert(rec1.anchorText === 'GrowthLabs platform', 'Record 1 anchorText mapped');
    assert(rec1.linkType === 'dofollow', 'Record 1 linkType mapped to dofollow (nofollow: false)');
    assert(rec1.firstSeen instanceof Date && rec1.firstSeen.getFullYear() === 2026, 'Record 1 firstSeen parsed as valid Date');
    assert(rec1.lastSeen instanceof Date && rec1.lastSeen.getFullYear() === 2026, 'Record 1 lastSeen parsed as valid Date');
    assert(rec1.provider === 'moz', 'Record 1 provider is moz');
    assert(rec1.meta.sourceTitle === 'Top SaaS Growth Innovations 2026', 'Record 1 meta.sourceTitle mapped');
    assert(rec1.meta.spamScore === 1, 'Record 1 meta.spamScore mapped');

    // Check record 2 (nofollow)
    const rec2 = normalized[1];
    assert(rec2.sourceUrl === 'https://reddit.com/r/startups/comments/growth_tools', 'Record 2 sourceUrl formatted');
    assert(rec2.linkType === 'nofollow', 'Record 2 linkType mapped to nofollow (nofollow: true)');
    assert(rec2.sourceDomainAuthority === 90, 'Record 2 DA mapped (90)');
  }

  // 3. Test missing and optional fields safely handled
  {
    const sparseResponse = {
      results: [
        {
          source: {
            page: 'https://blog.example.com/mention'
            // No DA, PA, spam_score, root_domain
          },
          target: {
            page: 'https://growthlabs.io/'
          }
          // No anchor_text, no dates, no nofollow boolean
        }
      ]
    };

    const sparseNormalized = mozProvider.normalizeLinksResponse('growthlabs.io', sparseResponse);
    assert(sparseNormalized.length === 1, 'Sparse record safely normalized');
    assert(sparseNormalized[0].sourceDomain === 'blog.example.com', 'Domain fallback extracted from sourceUrl');
    assert(sparseNormalized[0].sourceDomainAuthority === null, 'Missing DA is safely null');
    assert(sparseNormalized[0].sourcePageAuthority === null, 'Missing PA is safely null');
    assert(sparseNormalized[0].anchorText === '', 'Missing anchorText is safely empty string');
    assert(sparseNormalized[0].linkType === 'unknown', 'Missing nofollow boolean is safely unknown');
    assert(sparseNormalized[0].firstSeen === null, 'Missing firstSeen is safely null');
    assert(sparseNormalized[0].lastSeen === null, 'Missing lastSeen is safely null');
  }

  // 4. Test error handling & empty responses
  {
    // Empty results
    const emptyResult = mozProvider.normalizeLinksResponse('growthlabs.io', { results: [] });
    assert(Array.isArray(emptyResult) && emptyResult.length === 0, 'Empty results array returns []');

    const nullResult = mozProvider.normalizeLinksResponse('growthlabs.io', null);
    assert(Array.isArray(nullResult) && nullResult.length === 0, 'Null response returns []');
  }

  // 5. Test MongoDB Persistence & Duplicate Prevention
  {
    const user = await User.create({
      name: 'Moz Test User',
      email: 'mozuser@linkora.io',
      password: 'password123'
    });

    const website = await Website.create({
      userId: user._id,
      name: 'Growth Labs',
      domain: 'growthlabs.io',
      url: 'https://growthlabs.io',
      verificationStatus: 'verified',
      verificationToken: 'token-growthlabs',
      isActive: true
    });

    const mockMozBacklinks = [
      {
        sourceUrl: 'https://techcrunch.com/2026/01/growth-innovations',
        sourceDomain: 'techcrunch.com',
        targetUrl: 'https://growthlabs.io/features',
        anchorText: 'GrowthLabs platform',
        linkType: 'dofollow',
        sourceDomainAuthority: 92,
        sourcePageAuthority: 45,
        firstSeen: new Date('2026-02-15'),
        lastSeen: new Date('2026-10-20'),
        provider: 'moz',
        meta: { sourceTitle: 'Top SaaS Growth Innovations 2026', spamScore: 1 }
      },
      {
        sourceUrl: 'https://reddit.com/r/startups/comments/growth_tools',
        sourceDomain: 'reddit.com',
        targetUrl: 'https://growthlabs.io/',
        anchorText: 'https://growthlabs.io',
        linkType: 'nofollow',
        sourceDomainAuthority: 90,
        sourcePageAuthority: 30,
        firstSeen: new Date('2026-04-01'),
        lastSeen: new Date('2026-09-12'),
        provider: 'moz',
        meta: { sourceTitle: 'Favorite growth tools?', spamScore: 2 }
      }
    ];

    // Initial save
    const saveRes = await backlinkStorageService.saveBacklinks({
      userId: user._id,
      websiteId: website._id,
      backlinksList: mockMozBacklinks,
      provider: 'moz'
    });

    assert(saveRes.upsertedCount === 2, 'Initial sync saves 2 backlink records');
    assert(saveRes.totalProcessed === 2, 'Total processed is 2');

    const totalInDb = await Backlink.countDocuments({ websiteId: website._id });
    assert(totalInDb === 2, 'Database contains exactly 2 backlink documents');

    // Duplicate Prevention: Sync again with same records (simulating repeated Moz sync)
    const reSyncBacklinks = [
      {
        sourceUrl: 'https://techcrunch.com/2026/01/growth-innovations',
        sourceDomain: 'techcrunch.com',
        targetUrl: 'https://growthlabs.io/features',
        anchorText: 'GrowthLabs platform (updated)',
        linkType: 'dofollow',
        sourceDomainAuthority: 93, // Updated DA
        sourcePageAuthority: 46,
        firstSeen: new Date('2026-02-15'),
        lastSeen: new Date('2026-11-23'),
        provider: 'moz'
      },
      {
        sourceUrl: 'https://reddit.com/r/startups/comments/growth_tools',
        sourceDomain: 'reddit.com',
        targetUrl: 'https://growthlabs.io/',
        anchorText: 'https://growthlabs.io',
        linkType: 'nofollow',
        sourceDomainAuthority: 90,
        sourcePageAuthority: 30,
        firstSeen: new Date('2026-04-01'),
        lastSeen: new Date('2026-11-23'),
        provider: 'moz'
      }
    ];

    const reSyncRes = await backlinkStorageService.saveBacklinks({
      userId: user._id,
      websiteId: website._id,
      backlinksList: reSyncBacklinks,
      provider: 'moz'
    });

    assert(reSyncRes.upsertedCount === 2, 'Re-sync processed 2 records');
    const totalAfterReSync = await Backlink.countDocuments({ websiteId: website._id });
    assert(totalAfterReSync === 2, 'Duplicate prevention: count in DB remains 2 (no duplicate rows)');

    // Verify record was updated in place
    const updatedDoc = await Backlink.findOne({
      websiteId: website._id,
      sourceUrl: 'https://techcrunch.com/2026/01/growth-innovations'
    });
    assert(updatedDoc.sourceDomainAuthority === 93, 'In-place update: DA updated from 92 to 93');
    assert(updatedDoc.anchorText === 'GrowthLabs platform (updated)', 'In-place update: anchorText updated');

    // 6. Test Backlink Explorer retrieval on saved Moz records
    const explorerResult = await backlinkStorageService.getSavedBacklinks({
      userId: user._id,
      websiteId: website._id,
      page: 1,
      limit: 10
    });
    assert(explorerResult.backlinks.length === 2, 'Backlink Explorer retrieves saved Moz records');
    assert(explorerResult.pagination.total === 2, 'Explorer pagination reports total 2');

    // Filter by linkType
    const dofollowResult = await backlinkStorageService.getSavedBacklinks({
      userId: user._id,
      websiteId: website._id,
      linkType: 'dofollow'
    });
    assert(dofollowResult.backlinks.length === 1, 'Filter linkType=dofollow returns 1 record');
    assert(dofollowResult.backlinks[0].sourceDomain === 'techcrunch.com', 'Dofollow record is techcrunch.com');

    const nofollowResult = await backlinkStorageService.getSavedBacklinks({
      userId: user._id,
      websiteId: website._id,
      linkType: 'nofollow'
    });
    assert(nofollowResult.backlinks.length === 1, 'Filter linkType=nofollow returns 1 record');
    assert(nofollowResult.backlinks[0].sourceDomain === 'reddit.com', 'Nofollow record is reddit.com');

    // Stats verification
    const stats = await backlinkStorageService.getBacklinkStats({
      userId: user._id,
      websiteId: website._id
    });
    assert(stats.totalSavedBacklinks === 2, 'Stats: totalSavedBacklinks is 2');
    assert(stats.dofollowCount === 1, 'Stats: dofollowCount is 1');
    assert(stats.nofollowCount === 1, 'Stats: nofollowCount is 1');
    assert(stats.uniqueReferringDomains === 2, 'Stats: uniqueReferringDomains is 2');
  }

  console.log('\n======================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

setup()
  .then(runTests)
  .then(teardown)
  .catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
