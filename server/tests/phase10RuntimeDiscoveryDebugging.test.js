import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';

import { calculateOpportunityScore } from '../services/discovery/opportunityScorer.js';
import { campaignDiscoveryService } from '../services/discovery/campaignDiscoveryService.js';
import { contactDiscoveryService } from '../services/discovery/contactDiscoveryService.js';
import { searchDiscoveryProvider } from '../services/discovery/providers/searchDiscoveryProvider.js';
import { competitorDiscoveryProvider } from '../services/discovery/providers/competitorDiscoveryProvider.js';
import { seoService } from '../services/seo/seoService.js';
import { campaignService } from '../services/campaignService.js';

let mongoServer;
let testUser;
let testWebsite;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  testUser = await User.create({
    name: 'Debug Test User',
    email: 'debugger@linkora.com',
    authProvider: 'local',
    passwordHash: 'dummyhash123'
  });

  testWebsite = await Website.create({
    userId: testUser._id,
    name: 'My Brand',
    domain: 'mybrand.io',
    url: 'https://mybrand.io',
    verificationStatus: 'verified',
    verificationToken: 'token-debug-123'
  });
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 10: Runtime Debugging Test Suite     ');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Missing Metrics Not Treated As Zero in Opportunity Scoring
    // -------------------------------------------------------------------------
    console.log('--- 1. Missing Metrics Scored Neutrally & Baseline Verified ---');
    const unassessedScoring = calculateOpportunityScore({
      domainAuthority: null,
      spamScore: null,
      competitorOverlap: 0,
      source: 'keyword',
      linkType: 'unknown'
    });

    assert(
      unassessedScoring.score === 48,
      `Expected unassessed opportunity score to be 48 (not 33 or 0), got: ${unassessedScoring.score}`
    );
    assert(
      unassessedScoring.factors.some((f) => f.factor === 'DA Unassessed' && f.points === 15),
      'DA Unassessed factor awards fair 15 points baseline instead of 0'
    );
    console.log('  PASS: Missing DA is evaluated with 15pt baseline and achieves opportunity score 48 >= 40');

    // -------------------------------------------------------------------------
    // TEST 2: Reproduction of 55 Discovered / 41 Unique / Moz 403 Failure
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Reproduction: 55 Raw / 41 Unique Domains with Moz Enrichment Failure ---');

    // Generate 41 unique mock domains (and 14 duplicate references = 55 total)
    const mockKeywordResults = [];
    for (let i = 1; i <= 41; i++) {
      mockKeywordResults.push({
        prospectDomain: `discovered-site-${i}.com`,
        prospectUrl: `https://discovered-site-${i}.com/blog/link-building`,
        source: 'keyword',
        discoveredFrom: 'Keyword: "SaaS tools"',
        discoveryKeyword: 'SaaS tools',
        competitorDomains: [],
        domainAuthority: null,
        pageAuthority: null,
        spamScore: null,
        opportunityScore: null,
        opportunityFactors: [],
        linkType: 'unknown'
      });
    }
    // Add 14 duplicates across different queries
    for (let i = 1; i <= 14; i++) {
      mockKeywordResults.push({
        prospectDomain: `discovered-site-${i}.com`,
        prospectUrl: `https://discovered-site-${i}.com/resources/saas`,
        source: 'keyword',
        discoveredFrom: 'Keyword: "SaaS resources"',
        discoveryKeyword: 'SaaS resources',
        competitorDomains: [],
        domainAuthority: null,
        pageAuthority: null,
        spamScore: null,
        opportunityScore: null,
        opportunityFactors: [],
        linkType: 'unknown'
      });
    }

    assert(mockKeywordResults.length === 55, 'Mock produces exactly 55 raw keyword results');

    // Mock search provider discover to return these 55 results across queries
    const origDiscover = searchDiscoveryProvider.discover.bind(searchDiscoveryProvider);
    let discoverCallCount = 0;
    searchDiscoveryProvider.discover = async () => {
      discoverCallCount++;
      if (discoverCallCount === 1) {
        return mockKeywordResults;
      }
      return [];
    };

    // Mock seoService.getOverview to simulate Moz 403 Auth failure (as seen in actual browser environment)
    const origGetOverview = seoService.getOverview.bind(seoService);
    let enrichmentCalls = 0;
    seoService.getOverview = async (domain) => {
      enrichmentCalls++;
      const err = new Error('Moz API authentication failed. Please verify MOZ_API_TOKEN in server/.env.');
      err.status = 403;
      err.code = 'PROVIDER_AUTH_FAILED';
      throw err;
    };

    const campaign = await Campaign.create({
      userId: testUser._id,
      websiteId: testWebsite._id,
      name: 'Automated SaaS Campaign',
      campaignType: 'Guest Posting',
      niche: 'B2B SaaS',
      primaryKeywords: ['saas tools', 'b2b software'],
      targetProspects: 50,
      qualificationCriteria: {
        minDomainAuthority: 20,
        minPageAuthority: 0,
        maxSpamScore: 30,
        minOpportunityScore: 40,
        excludedDomains: [],
        excludeContacted: true,
        excludeRejected: true
      },
      discoverySources: {
        enableKeywordDiscovery: true,
        enableCompetitorDiscovery: false
      }
    });

    const discoveryRes = await campaignDiscoveryService.runCampaignDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id
    });

    assert(discoveryRes.success === true, 'Campaign discovery completed successfully');
    assert(enrichmentCalls === 1, `Enrichment loop broke immediately on 403 without hanging 20 times (calls: ${enrichmentCalls})`);

    const updatedCamp = await Campaign.findById(campaign._id);
    assert(updatedCamp.discoverySummary.totalDiscovered === 55, `totalDiscovered is 55 (got: ${updatedCamp.discoverySummary.totalDiscovered})`);
    assert(updatedCamp.discoverySummary.uniqueDomainsCount === 41, `uniqueDomainsCount is 41 (got: ${updatedCamp.discoverySummary.uniqueDomainsCount})`);
    assert(updatedCamp.discoverySummary.duplicateCount === 14, `duplicateCount is 14 (got: ${updatedCamp.discoverySummary.duplicateCount})`);
    assert(updatedCamp.discoverySummary.enrichmentFailureCount === 20, `enrichmentFailureCount is 20 (got: ${updatedCamp.discoverySummary.enrichmentFailureCount})`);
    assert(updatedCamp.discoverySummary.warnings.some((w) => w.source === 'enrichment'), 'Enrichment failure warning is recorded in discoverySummary');
    assert(updatedCamp.discoverySummary.qualifiedCount === 41, `All 41 unique domains qualified (got: ${updatedCamp.discoverySummary.qualifiedCount})`);
    assert(updatedCamp.discoverySummary.assignedCount === 41, `All 41 unique domains assigned (got: ${updatedCamp.discoverySummary.assignedCount})`);

    console.log('  PASS: Discovered: 55, Unique: 41, Enriched: 0 (Failed: 20), Qualified: 41, Assigned: 41');
    console.log('  PASS: Enrichment error was NOT swallowed; diagnostic warning recorded in summary');

    // -------------------------------------------------------------------------
    // TEST 3: Inspection of All 41 Discovered Domains in Database
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Inspection of Stored Discovered Domains in MongoDB ---');
    const storedProspects = await Prospect.find({
      userId: testUser._id,
      websiteId: testWebsite._id,
      discoveredCampaigns: campaign._id
    });

    assert(storedProspects.length === 41, `Expected 41 prospects saved in MongoDB, found: ${storedProspects.length}`);
    for (const p of storedProspects) {
      assert(p.domainAuthority === null, `DA is null as Moz failed (${p.prospectDomain})`);
      assert(p.opportunityScore === 48, `Opportunity score is calculated (48) for ${p.prospectDomain}`);
      assert(p.status === 'saved', `Prospect status is saved for ${p.prospectDomain}`);
      assert(p.discoveredCampaigns.includes(campaign._id), `Prospect links to campaign ID`);
    }

    const campaignAssignments = await CampaignProspectAssignment.find({
      campaignId: campaign._id
    });
    assert(campaignAssignments.length === 41, `Exactly 41 assignments exist in CampaignProspectAssignment collection`);
    console.log('  PASS: All 41 prospects successfully saved to MongoDB and assigned to campaign');

    // -------------------------------------------------------------------------
    // TEST 4: Qualification Filtering Rejection Reasons
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Qualification Filtering & Rejection Reason Tracking ---');

    // Create a campaign with strict DA (>= 30) and Spam (<= 5%)
    const strictCampaign = await Campaign.create({
      userId: testUser._id,
      websiteId: testWebsite._id,
      name: 'Strict Filter Campaign',
      niche: 'Fintech',
      qualificationCriteria: {
        minDomainAuthority: 30,
        maxSpamScore: 5,
        minOpportunityScore: 60
      },
      discoverySources: {
        enableKeywordDiscovery: true,
        enableCompetitorDiscovery: false
      }
    });

    // Mock search returning prospects with known metrics that will be rejected for specific reasons
    searchDiscoveryProvider.discover = async () => [
      {
        prospectDomain: 'low-da-site.com',
        prospectUrl: 'https://low-da-site.com',
        source: 'keyword',
        domainAuthority: 12, // < 30
        spamScore: 1,
        linkType: 'unknown'
      },
      {
        prospectDomain: 'high-spam-site.com',
        prospectUrl: 'https://high-spam-site.com',
        source: 'keyword',
        domainAuthority: 40,
        spamScore: 25, // > 5
        linkType: 'unknown'
      },
      {
        prospectDomain: 'low-score-site.com',
        prospectUrl: 'https://low-score-site.com',
        source: 'keyword',
        domainAuthority: 10,
        spamScore: 40, // Score will be low
        linkType: 'unknown'
      }
    ];

    seoService.getOverview = async () => ({ success: true, data: {} });

    await campaignDiscoveryService.runCampaignDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: strictCampaign._id
    });

    const strictUpdated = await Campaign.findById(strictCampaign._id);
    assert(strictUpdated.discoverySummary.rejectedCount > 0, 'Rejections tracked');
    assert(strictUpdated.discoverySummary.rejectionBreakdown.daBelowThreshold >= 1, 'Tracked daBelowThreshold');
    assert(strictUpdated.discoverySummary.rejectionBreakdown.spamAboveThreshold >= 1, 'Tracked spamAboveThreshold');

    // Verify rejected prospect stored in database with reason in notes
    const rejectedDoc = await Prospect.findOne({ prospectDomain: 'low-da-site.com' });
    assert(rejectedDoc, 'Rejected prospect stored in DB');
    assert(rejectedDoc.notes.includes('Domain Authority (12) is below required minimum (30)'), `Rejection reason recorded in notes: ${rejectedDoc.notes}`);
    console.log('  PASS: Rejection reasons tracked in rejectionBreakdown and recorded in Prospect notes');

    // -------------------------------------------------------------------------
    // TEST 5: Contact Discovery Initialising Issue & Synchronous Status Write
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Contact Discovery: Synchronous Status Write & Execution ---');

    // Case 5A: When campaign has 0 prospects
    const emptyCampaign = await Campaign.create({
      userId: testUser._id,
      websiteId: testWebsite._id,
      name: 'Empty Campaign',
      niche: 'Empty'
    });

    const emptyContactRes = await contactDiscoveryService.runCampaignContactDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: emptyCampaign._id
    });

    assert(
      emptyContactRes.status === 'no_prospects',
      `Expected no_prospects status when 0 assignments, got: ${emptyContactRes.status}`
    );
    console.log('  PASS: 0 assignments returns status="no_prospects" immediately without hanging in initialising');

    // Case 5B: When campaign has 41 assigned prospects
    // Mock website crawler to return contact emails for 2 sites and none for others
    contactDiscoveryService.crawlWebsite = async (domain) => {
      if (domain === 'discovered-site-1.com') {
        return [
          {
            email: 'editor@discovered-site-1.com',
            name: 'Editorial Team',
            role: 'Editor',
            sourceUrl: `https://${domain}/contact`,
            discoveryMethod: 'website_crawl',
            confidenceScore: 85,
            verificationStatus: 'verified',
            discoveredAt: new Date()
          }
        ];
      }
      if (domain === 'discovered-site-2.com') {
        return [
          {
            email: 'hello@discovered-site-2.com',
            name: 'Support',
            role: 'General',
            sourceUrl: `https://${domain}/about`,
            discoveryMethod: 'website_crawl',
            confidenceScore: 80,
            verificationStatus: 'verified',
            discoveredAt: new Date()
          }
        ];
      }
      return [];
    };

    contactDiscoveryService.searchFallback = async () => [];

    // Wait for the automatic background job from discovery to conclude or clear it
    await new Promise((resolve) => setTimeout(resolve, 500));
    contactDiscoveryService.activeJobs.delete(`${campaign._id}`);

    // Trigger contact discovery for the 41-prospect campaign
    const contactRunRes = await contactDiscoveryService.runCampaignContactDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      forceRetry: true
    });

    assert(contactRunRes.status === 'started', 'Contact discovery returned started');
    assert(contactRunRes.total === 41, `Total prospects is 41 (got: ${contactRunRes.total})`);

    // Verify Campaign in DB has status: 'running' IMMEDIATELY (no delay/no stuck in initializing)
    const runningCamp = await Campaign.findById(campaign._id);
    assert(
      runningCamp.discoverySummary.contactDiscoveryProgress.status === 'running' ||
      runningCamp.discoverySummary.contactDiscoveryProgress.status === 'completed',
      'Campaign in MongoDB is running or completed'
    );
    assert(
      runningCamp.discoverySummary.contactDiscoveryProgress.total === 41,
      `Campaign in MongoDB records total=41`
    );

    // Wait briefly for background crawler to finish
    await new Promise((resolve) => setTimeout(resolve, 800));

    const finishedCamp = await Campaign.findById(campaign._id);
    assert(
      finishedCamp.discoverySummary.contactDiscoveryProgress.status === 'completed',
      `Contact discovery finished with status completed (got: ${finishedCamp.discoverySummary.contactDiscoveryProgress.status})`
    );
    assert(
      finishedCamp.discoverySummary.contactEmailsFoundCount >= 2,
      `Emails found is >= 2 (got: ${finishedCamp.discoverySummary.contactEmailsFoundCount})`
    );

    console.log('  PASS: Synchronous running status written to DB before API return');
    console.log('  PASS: Background crawler completed, discovered emails, and updated progress counters');

    // -------------------------------------------------------------------------
    // TEST 6: Contact Discovery Force Retry & Lock Clearing
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Contact Discovery Force Retry & Lock Clearing ---');
    // Simulate stale active job lock
    contactDiscoveryService.activeJobs.add(`${campaign._id}`);
    const blockedRes = await contactDiscoveryService.runCampaignContactDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      forceRetry: false
    });
    assert(blockedRes.status === 'already_running', 'Blocks duplicate job when lock is active');

    // Force retry clears lock and proceeds
    const retryRes = await contactDiscoveryService.runCampaignContactDiscovery({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      forceRetry: true
    });
    assert(retryRes.status === 'started', 'forceRetry=true clears stale lock and initiates job');
    console.log('  PASS: Duplicate job prevented; forceRetry clears stale lock successfully');

    // -------------------------------------------------------------------------
    // TEST 7: Campaign Prospects GET Endpoint & Tab Filters
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Campaign Prospects GET Endpoint & Tab Counts Parity ---');
    const allProspectsRes = await campaignService.getCampaignProspects({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      contactFilter: 'all',
      limit: 50
    });

    assert(allProspectsRes.assignments.length === 41, `All prospects returns 41 (got: ${allProspectsRes.assignments.length})`);
    assert(allProspectsRes.stats.total === 41, `Stats total is 41 (got: ${allProspectsRes.stats.total})`);
    assert(allProspectsRes.stats.emailAvailable >= 2, `Stats emailAvailable is >= 2 (got: ${allProspectsRes.stats.emailAvailable})`);
    assert(allProspectsRes.stats.noEmail <= 39, `Stats noEmail is <= 39 (got: ${allProspectsRes.stats.noEmail})`);

    const emailAvailableRes = await campaignService.getCampaignProspects({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      contactFilter: 'email_available',
      limit: 50
    });
    assert(
      emailAvailableRes.assignments.length === allProspectsRes.stats.emailAvailable,
      'Email Available tab count matches assignments length'
    );
    for (const a of emailAvailableRes.assignments) {
      assert(a.prospect.contactEmail, 'Every prospect in Email Available has contact email');
    }

    const noEmailRes = await campaignService.getCampaignProspects({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campaign._id,
      contactFilter: 'no_email',
      limit: 50
    });
    assert(
      noEmailRes.assignments.length === allProspectsRes.stats.noEmail,
      'No Email tab count matches assignments length'
    );
    assert(
      noEmailRes.pagination.total === allProspectsRes.stats.noEmail,
      'No Email pagination total matches stats.noEmail'
    );
    for (const a of noEmailRes.assignments) {
      assert(!a.prospect.contactEmail, 'Every prospect in No Email has empty contact email');
    }

    console.log('  PASS: All Prospects, Email Available, and No Email tabs match backend counts 100%');

    // Restore original methods
    searchDiscoveryProvider.discover = origDiscover;
    seoService.getOverview = origGetOverview;

    console.log('\n======================================================');
    console.log('All Runtime Debugging & Workflow Tests Passed Successfully!');
    console.log('======================================================\n');
  } finally {
    await teardown();
  }
}

setup().then(runTests).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
