import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import Prospect, { normalizeDomain } from '../models/Prospect.js';
import { calculateOpportunityScore } from '../services/discovery/opportunityScorer.js';
import { competitorDiscoveryProvider } from '../services/discovery/providers/competitorDiscoveryProvider.js';
import { searchDiscoveryProvider } from '../services/discovery/providers/searchDiscoveryProvider.js';
import { discoveryService } from '../services/discovery/discoveryService.js';
import { prospectService } from '../services/discovery/prospectService.js';
import { seoService } from '../services/seo/seoService.js';

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
  console.log('   LINKORA Phase 9: Link Prospecting & Discovery Tests');
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

  // 1. Seed Users & Websites
  const userA = await User.create({
    name: 'Prospector A',
    email: 'prospectorA@linkora.io',
    password: 'password123'
  });

  const userB = await User.create({
    name: 'Prospector B',
    email: 'prospectorB@linkora.io',
    password: 'password123'
  });

  const websiteA = await Website.create({
    userId: userA._id,
    name: 'SaaS Platform',
    domain: 'mysaas.io',
    url: 'https://mysaas.io',
    verificationStatus: 'verified',
    verificationToken: 'token-saas-123',
    isActive: true
  });

  const websiteB = await Website.create({
    userId: userB._id,
    name: 'Shop Store',
    domain: 'shopstore.com',
    url: 'https://shopstore.com',
    verificationStatus: 'verified',
    verificationToken: 'token-shop-123',
    isActive: true
  });

  // Seed an existing backlink for websiteA (so we can test exclusion)
  await Backlink.create({
    userId: userA._id,
    websiteId: websiteA._id,
    sourceUrl: 'https://already-linking.com/resources',
    sourceDomain: 'already-linking.com',
    targetUrl: 'https://mysaas.io',
    anchorText: 'SaaS Tool',
    linkType: 'dofollow',
    status: 'active'
  });

  console.log('\n--- Test Group 1: Domain Normalization ---');

  assert(
    normalizeDomain('https://www.TechCrunch.com/blog/post?ref=1') === 'techcrunch.com',
    'Strips protocol, www, path, query and lowercases'
  );
  assert(
    normalizeDomain('http://sub.domain.co.uk:8080/path/') === 'sub.domain.co.uk',
    'Strips port and trailing slashes'
  );
  assert(
    normalizeDomain('   GITHUB.COM   ') === 'github.com',
    'Trims whitespace and lowercases domain'
  );
  assert(normalizeDomain('') === '', 'Handles empty or invalid input safely');

  console.log('\n--- Test Group 2: Opportunity Scoring Formula ---');

  // Test 2.1: High authority, clean spam, multi-competitor overlap, dofollow
  const highScore = calculateOpportunityScore({
    domainAuthority: 82,
    spamScore: 2,
    competitorOverlap: 2,
    source: 'competitor',
    linkType: 'dofollow'
  });
  // 40 (DA>=75) + 20 (spam<5) + 25 (overlap>=2) + 15 (dofollow) = 100
  assert(highScore.score === 100, `High quality prospect achieves maximum score: ${highScore.score}`);
  assert(Array.isArray(highScore.factors) && highScore.factors.length === 4, 'Includes 4 explainable score factors');

  // Test 2.2: Low authority, high spam penalty
  const lowScore = calculateOpportunityScore({
    domainAuthority: 12,
    spamScore: 35, // -20 penalty
    competitorOverlap: 1,
    source: 'competitor',
    linkType: 'nofollow'
  });
  // 5 (DA<15) - 20 (spam>=30) + 18 (comp=1) + 5 (nofollow) = 8
  assert(lowScore.score === 8, `Spam penalty correctly lowers score: ${lowScore.score}`);
  assert(
    lowScore.factors.some((f) => f.factor === 'High Spam Risk Penalty'),
    'Reports High Spam Risk Penalty in factor breakdown'
  );

  // Test 2.3: Missing metrics handled gracefully without fabricating
  const missingScore = calculateOpportunityScore({
    domainAuthority: null,
    spamScore: null,
    competitorOverlap: 0,
    source: 'keyword',
    linkType: 'unknown'
  });
  assert(missingScore.score > 0 && missingScore.score < 50, `Unassessed prospect given baseline score: ${missingScore.score}`);
  assert(
    missingScore.factors.some((f) => f.factor === 'DA Unassessed'),
    'Clearly identifies DA Unassessed in breakdown'
  );

  console.log('\n--- Test Group 3: Competitor-Based Discovery ---');

  // Mock competitor backlinks
  const originalFetchBacklinks = seoService.fetchBacklinks.bind(seoService);
  seoService.fetchBacklinks = async (domain) => {
    if (domain === 'competitor-a.com') {
      return [
        {
          sourceUrl: 'https://techradar.com/best-saas',
          sourceDomain: 'techradar.com',
          targetUrl: 'https://competitor-a.com',
          anchorText: 'Competitor A Tool',
          linkType: 'dofollow',
          sourceDomainAuthority: 88,
          sourcePageAuthority: 65
        },
        {
          sourceUrl: 'https://already-linking.com/resources',
          sourceDomain: 'already-linking.com', // Should be excluded!
          targetUrl: 'https://competitor-a.com',
          anchorText: 'Competitor A',
          linkType: 'dofollow'
        },
        {
          sourceUrl: 'https://mysaas.io/blog/competitor-review',
          sourceDomain: 'mysaas.io', // User's own domain! Should be excluded!
          targetUrl: 'https://competitor-a.com',
          anchorText: 'Review'
        }
      ];
    }
    if (domain === 'competitor-b.com') {
      return [
        {
          sourceUrl: 'https://techradar.com/top-tools',
          sourceDomain: 'techradar.com', // Overlaps with competitor-a!
          targetUrl: 'https://competitor-b.com',
          anchorText: 'Competitor B Alternative',
          linkType: 'dofollow',
          sourceDomainAuthority: 88
        },
        {
          sourceUrl: 'https://indiehackers.com/product-roundup',
          sourceDomain: 'indiehackers.com',
          targetUrl: 'https://competitor-b.com',
          anchorText: 'Product',
          linkType: 'dofollow',
          sourceDomainAuthority: 74
        }
      ];
    }
    return [];
  };

  const discoveryResult = await discoveryService.discoverCompetitorProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    competitorDomains: ['competitor-a.com', 'competitor-b.com']
  });

  assert(discoveryResult.success === true, 'Competitor discovery executed successfully');
  assert(discoveryResult.totalDiscovered === 2, `Discovered exactly 2 unique candidates (found: ${discoveryResult.totalDiscovered})`);

  // Verify exclusions
  const foundDomains = discoveryResult.prospects.map((p) => p.prospectDomain);
  assert(!foundDomains.includes('mysaas.io'), "User's own domain was strictly excluded");
  assert(!foundDomains.includes('already-linking.com'), 'Already linking domain was strictly excluded');
  assert(foundDomains.includes('techradar.com'), 'TechRadar discovered as candidate');
  assert(foundDomains.includes('indiehackers.com'), 'IndieHackers discovered as candidate');

  // Verify multi-competitor overlap
  const techradar = discoveryResult.prospects.find((p) => p.prospectDomain === 'techradar.com');
  assert(
    techradar.competitorDomains.length === 2 &&
      techradar.competitorDomains.includes('competitor-a.com') &&
      techradar.competitorDomains.includes('competitor-b.com'),
    'TechRadar correctly identified as linking to BOTH competitors'
  );
  assert(
    techradar.opportunityScore >= 80,
    `Multi-competitor candidate scored high priority: ${techradar.opportunityScore}`
  );

  console.log('\n--- Test Group 4: Keyword Discovery Status & Safety ---');

  const discoveryStatus = discoveryService.getDiscoveryStatus();
  assert(
    typeof discoveryStatus.competitorDiscovery.configured === 'boolean',
    'Competitor discovery reports configuration status'
  );
  assert(
    discoveryStatus.competitorDiscovery.provider === 'moz',
    'Active competitor discovery provider is Moz'
  );
  assert(discoveryStatus.keywordDiscovery.supportedEngines.length >= 3, 'Reports supported search engines');

  // Unconfigured keyword search safely throws 503 code without crashing
  let unconfiguredHandled = false;
  try {
    // If not configured in test environment
    if (!discoveryStatus.keywordDiscovery.configured) {
      await discoveryService.discoverKeywordProspects({
        userId: userA._id,
        websiteId: websiteA._id,
        keyword: 'SaaS analytics tools'
      });
    } else {
      unconfiguredHandled = true; // configured in environment
    }
  } catch (err) {
    if (err.code === 'DISCOVERY_PROVIDER_UNCONFIGURED' && err.status === 503) {
      unconfiguredHandled = true;
    }
  }
  assert(unconfiguredHandled, 'Unconfigured keyword discovery provider handled safely with 503 code');

  console.log('\n--- Test Group 5: Prospect Storage & Duplicate Prevention ---');

  // Test 5.1: Save new prospect
  const save1 = await prospectService.saveProspect({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectData: {
      prospectDomain: 'techradar.com',
      prospectUrl: 'https://techradar.com/best-saas',
      source: 'competitor',
      discoveredFrom: 'competitor-a.com',
      competitorDomains: ['competitor-a.com', 'competitor-b.com'],
      domainAuthority: 88,
      notes: 'Initial outreach candidate'
    }
  });

  assert(save1.isNew === true, 'First save creates new prospect record');
  assert(save1.prospect.status === 'saved', 'Default status is saved');
  assert(save1.prospect.notes === 'Initial outreach candidate', 'Notes saved properly');

  // Test 5.2: Saving same domain again does NOT create duplicate, preserves notes & status
  // Update status manually first
  await Prospect.updateOne(
    { _id: save1.prospect.id },
    { $set: { status: 'reviewed', notes: 'User customized note' } }
  );

  const save2 = await prospectService.saveProspect({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectData: {
      prospectDomain: 'https://www.TechRadar.com/other-page', // URL format variation
      source: 'competitor',
      discoveredFrom: 'competitor-b.com'
    }
  });

  assert(save2.isNew === false, 'Duplicate save detected existing prospect (isNew: false)');
  const dbCount = await Prospect.countDocuments({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectDomain: 'techradar.com'
  });
  assert(dbCount === 1, 'Database strictly holds exactly 1 record for this domain (no duplicates)');

  const freshDoc = await Prospect.findById(save1.prospect.id);
  assert(freshDoc.status === 'reviewed', 'Existing user-assigned status was preserved on rediscovery');
  assert(freshDoc.notes === 'User customized note', 'Existing user notes were preserved on rediscovery');

  console.log('\n--- Test Group 6: Bulk Save & Candidate Annotation ---');

  const bulkSaveResult = await prospectService.bulkSave({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectsList: [
      {
        prospectDomain: 'indiehackers.com',
        prospectUrl: 'https://indiehackers.com/products',
        source: 'competitor',
        domainAuthority: 74,
        opportunityScore: 78
      },
      {
        prospectDomain: 'producthunt.com',
        prospectUrl: 'https://producthunt.com',
        source: 'directory',
        domainAuthority: 92,
        opportunityScore: 85
      },
      {
        prospectDomain: 'techradar.com' // already exists
      }
    ]
  });

  assert(bulkSaveResult.savedCount === 2, `Bulk saved 2 new prospects (got: ${bulkSaveResult.savedCount})`);
  assert(bulkSaveResult.existingCount === 1, `Recognized 1 existing prospect (got: ${bulkSaveResult.existingCount})`);

  // Verify discovery results now reflect isSaved: true
  const rediscovery = await discoveryService.discoverCompetitorProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    competitorDomains: ['competitor-a.com', 'competitor-b.com']
  });
  const trRediscovered = rediscovery.prospects.find((p) => p.prospectDomain === 'techradar.com');
  assert(trRediscovered.isSaved === true, 'Discovered candidate now tagged with isSaved: true');
  assert(trRediscovered.savedStatus === 'reviewed', 'Discovered candidate reflects user savedStatus');

  console.log('\n--- Test Group 7: Prospect CRUD Operations ---');

  // Update status & notes
  const updatedIndie = await prospectService.updateProspect({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectId: bulkSaveResult.prospects[0].id,
    status: 'qualified',
    notes: 'Contacted editor on Twitter',
    contactEmail: 'editor@indiehackers.com'
  });
  assert(updatedIndie.status === 'qualified', 'Updated prospect status to qualified');
  assert(updatedIndie.notes === 'Contacted editor on Twitter', 'Updated notes');
  assert(updatedIndie.contactEmail === 'editor@indiehackers.com', 'Updated contact email');

  // Get by ID
  const fetched = await prospectService.getProspectById({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectId: updatedIndie.id
  });
  assert(fetched.prospectDomain === 'indiehackers.com', 'Fetched single prospect by ID');

  console.log('\n--- Test Group 8: Search, Filters, Sorting & Pagination ---');

  // Search by domain
  const searchDomain = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    search: 'indie'
  });
  assert(searchDomain.prospects.length === 1, 'Search finds 1 prospect by domain keyword');

  // Search in notes
  const searchNotes = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    search: 'Twitter'
  });
  assert(searchNotes.prospects.length === 1, 'Search finds prospect by text in notes');

  // Filter by status
  const filterQualified = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    status: 'qualified'
  });
  assert(filterQualified.prospects.length === 1, 'Filter status=qualified returns 1 prospect');

  // Filter by min DA
  const filterDa = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    minDA: 80
  });
  assert(
    filterDa.prospects.every((p) => p.domainAuthority >= 80),
    'Filter minDA=80 only returns high DA prospects'
  );

  // Sorting by opportunityScore desc
  const sorted = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    sortBy: 'opportunityScore',
    sortOrder: 'desc'
  });
  assert(
    sorted.prospects[0].opportunityScore >= sorted.prospects[1].opportunityScore,
    'Prospects sorted properly by opportunityScore desc'
  );

  // Pagination
  const paginated = await prospectService.getSavedProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    limit: 2,
    page: 1
  });
  assert(paginated.prospects.length === 2, 'Pagination limit returns exact count');
  assert(paginated.pagination.total === 3, 'Pagination reports total 3 prospects');
  assert(paginated.pagination.totalPages === 2, 'Pagination reports 2 total pages');
  assert(paginated.pagination.hasNextPage === true, 'Pagination reports hasNextPage');

  console.log('\n--- Test Group 9: Bulk Status Update & Bulk Delete ---');

  // Bulk update status to rejected
  const allIds = [save1.prospect.id, bulkSaveResult.prospects[0].id];
  const bulkStatusRes = await prospectService.bulkUpdateStatus({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectIds: allIds,
    status: 'rejected'
  });
  assert(bulkStatusRes.modifiedCount === 2, 'Bulk updated status for 2 prospects');

  // Bulk delete 1 prospect
  const bulkDelRes = await prospectService.bulkDelete({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectIds: [save1.prospect.id]
  });
  assert(bulkDelRes.deletedCount === 1, 'Bulk deleted 1 prospect');

  const afterDel = await Prospect.findById(save1.prospect.id);
  assert(afterDel === null, 'Deleted prospect removed from MongoDB');

  console.log('\n--- Test Group 10: Dashboard Stats & CSV Export ---');

  const stats = await prospectService.getStats({
    userId: userA._id,
    websiteId: websiteA._id
  });
  assert(stats.totalSaved === 2, 'Stats reports correct total saved prospects (2)');
  assert(typeof stats.avgDA === 'number', 'Stats reports calculated average DA');

  const csv = await prospectService.exportCsv({
    userId: userA._id,
    websiteId: websiteA._id
  });
  assert(csv.includes('Domain,URL,Opportunity Score'), 'CSV export includes proper headers');
  assert(csv.includes('indiehackers.com'), 'CSV export includes saved prospect domain');
  assert(csv.includes('producthunt.com'), 'CSV export includes second prospect domain');

  console.log('\n--- Test Group 11: Multi-Tenant Security & Isolation ---');

  // User B cannot access User A's prospect
  let userBBlocked = false;
  try {
    await prospectService.getProspectById({
      userId: userB._id, // User B
      websiteId: websiteA._id,
      prospectId: bulkSaveResult.prospects[0].id
    });
  } catch (err) {
    if (err.status === 404) userBBlocked = true;
  }
  assert(userBBlocked, "User B cannot access User A's prospect details (404/unauthorized)");

  // User B cannot run discovery on User A's website
  let discoveryBlocked = false;
  try {
    await discoveryService.discoverCompetitorProspects({
      userId: userB._id, // User B
      websiteId: websiteA._id, // Website A (belongs to User A)
      competitorDomains: ['comp.com']
    });
  } catch (err) {
    if (err.status === 404) discoveryBlocked = true;
  }
  assert(discoveryBlocked, "User B cannot run discovery on User A's website (404)");

  // Restore mock
  seoService.fetchBacklinks = originalFetchBacklinks;

  console.log('\n======================================================');
  console.log(`Phase 9 Test Summary: ${passed} Passed, ${failed} Failed`);
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
