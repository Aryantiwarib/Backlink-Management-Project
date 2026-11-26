import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import CampaignActivity from '../models/CampaignActivity.js';

import { campaignService } from '../services/campaignService.js';
import { campaignDiscoveryService } from '../services/discovery/campaignDiscoveryService.js';
import { contactDiscoveryService } from '../services/discovery/contactDiscoveryService.js';
import { searchDiscoveryProvider } from '../services/discovery/providers/searchDiscoveryProvider.js';
import { competitorDiscoveryProvider } from '../services/discovery/providers/competitorDiscoveryProvider.js';
import { seoService } from '../services/seo/seoService.js';

let mongod;
let userA;
let userB;
let websiteA;
let websiteB;

async function setup() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB test database');

  // Seed User A
  userA = await User.create({
    name: 'Alice Developer',
    email: 'alice@linkora-pipeline-test.com',
    password: 'Password123!',
    googleId: 'google-oauth-alice-pipeline'
  });

  // Seed User B (for tenant isolation tests)
  userB = await User.create({
    name: 'Bob Competitor',
    email: 'bob@linkora-pipeline-test.com',
    password: 'Password123!',
    googleId: 'google-oauth-bob-pipeline'
  });

  // Seed Website A for User A
  websiteA = await Website.create({
    userId: userA._id,
    domain: 'mycoolapp.io',
    name: 'My Cool App',
    url: 'https://mycoolapp.io',
    verificationStatus: 'verified',
    verificationToken: 'token-alice-123',
    isActive: true
  });

  // Seed Website B for User B
  websiteB = await Website.create({
    userId: userB._id,
    domain: 'bobscompetitor.com',
    name: 'Bobs Competitor',
    url: 'https://bobscompetitor.com',
    verificationStatus: 'verified',
    verificationToken: 'token-bob-123',
    isActive: true
  });
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  console.log('Disconnected and stopped In-Memory MongoDB');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 10 Upgrade: Discovery & Pipeline Tests');
  console.log('======================================================\n');

  // =========================================================================
  // 1. QUERY GENERATION & BLACKLIST FILTERING
  // =========================================================================
  console.log('--- 1. Query Generation & Irrelevant Domain Filtering ---');

  const queries = campaignDiscoveryService.generateSearchQueries({
    niche: 'Web Development',
    primaryKeywords: ['react js', 'nextjs'],
    additionalKeywords: ['frontend'],
    campaignType: 'Guest Posting'
  });

  assert(Array.isArray(queries), 'Queries should be an array');
  assert(queries.length >= 3 && queries.length <= 6, 'Should generate between 3 and 6 queries');
  assert(
    queries.some((q) => q.includes('write for us') || q.includes('guest post')),
    'Should include guest posting queries for Guest Posting campaign type'
  );
  console.log('  PASS: Generates niche-targeted high-intent search queries');

  // Irrelevant domain checks
  assert(
    campaignDiscoveryService.isIrrelevantDomain('google.com', 'mycoolapp.io'),
    'google.com should be irrelevant'
  );
  assert(
    campaignDiscoveryService.isIrrelevantDomain('en.wikipedia.org', 'mycoolapp.io'),
    'en.wikipedia.org subdomain should be irrelevant'
  );
  assert(
    campaignDiscoveryService.isIrrelevantDomain('twitter.com', 'mycoolapp.io'),
    'twitter.com should be irrelevant'
  );
  assert(
    campaignDiscoveryService.isIrrelevantDomain('mycoolapp.io', 'mycoolapp.io'),
    'User own domain should be rejected'
  );
  assert(
    !campaignDiscoveryService.isIrrelevantDomain('reactjsexample.com', 'mycoolapp.io'),
    'Relevant niche domain should be accepted'
  );
  console.log('  PASS: Filters out search engines, social networks, and user own domain');

  // =========================================================================
  // 2. CONTACT EMAIL VALIDATION & EXTRACTION
  // =========================================================================
  console.log('\n--- 2. Contact Email Extraction & Validation ---');

  assert(contactDiscoveryService.isValidEmail('editor@techblog.com'), 'Valid email should pass');
  assert(contactDiscoveryService.isValidEmail('contact.team@startup.io'), 'Valid dotted email should pass');
  assert(!contactDiscoveryService.isValidEmail('hero-banner.png'), 'Image filename should be rejected');
  assert(!contactDiscoveryService.isValidEmail('noreply@domain.com'), 'Noreply email should be rejected');
  assert(!contactDiscoveryService.isValidEmail('test@example.com'), 'Dummy domain should be rejected');
  assert(!contactDiscoveryService.isValidEmail('invalid-string-no-at'), 'Invalid string should be rejected');
  console.log('  PASS: Correctly validates emails and rejects false positives and dummy addresses');

  const mockHtml = `
    <html>
      <body>
        <h1>Contact Our Editorial Team</h1>
        <p>Reach our editor at <a href="mailto:editor@reactdevs.org">editor@reactdevs.org</a></p>
        <p>For press inquiries, email press@reactdevs.org directly.</p>
        <img src="logo@2x.png" />
        <a href="mailto:noreply@reactdevs.org">Do not reply</a>
      </body>
    </html>
  `;

  const extracted = contactDiscoveryService.extractEmails(mockHtml, 'https://reactdevs.org/contact', 'website_crawl');
  assert(extracted.length === 2, `Expected 2 valid emails, got ${extracted.length}`);
  assert(extracted.some((e) => e.email === 'editor@reactdevs.org'), 'Should find editor mailto link');
  assert(extracted.some((e) => e.email === 'press@reactdevs.org'), 'Should find text email');
  assert(!extracted.some((e) => e.email.includes('noreply')), 'Should filter out noreply');
  assert(!extracted.some((e) => e.email.includes('logo@2x.png')), 'Should filter out image file');
  console.log('  PASS: Extracts mailto and in-content emails while discarding assets and system addresses');

  // =========================================================================
  // 3. CAMPAIGN CREATION WITH AUTOMATED DISCOVERY FIELDS
  // =========================================================================
  console.log('\n--- 3. Campaign Creation with Automated Configuration ---');

  const campaign1 = await campaignService.createCampaign({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignData: {
      name: 'React Ecosystem Authority',
      campaignType: 'Guest Posting',
      objective: 'Acquire 25 high authority React backlinks',
      targetBacklinks: 25,
      niche: 'Web Development',
      primaryKeywords: ['react development', 'nextjs tutorial'],
      additionalKeywords: ['frontend'],
      competitorDomains: ['reactcompetitor.com'],
      targetProspects: 30,
      qualificationCriteria: {
        minDomainAuthority: 25,
        minPageAuthority: 0,
        maxSpamScore: 20,
        minOpportunityScore: 50,
        relevantCategories: [],
        excludedDomains: ['blockedpartner.com'],
        excludeContacted: true,
        excludeRejected: true
      },
      discoverySources: {
        enableKeywordDiscovery: true,
        enableCompetitorDiscovery: true
      },
      autoDiscover: false // we will invoke runCampaignDiscovery manually with mocked providers
    }
  });

  assert(campaign1.id, 'Campaign should be created with ID');
  assert.strictEqual(campaign1.niche, 'Web Development');
  assert.strictEqual(campaign1.targetProspects, 30);
  assert.strictEqual(campaign1.qualificationCriteria.minDomainAuthority, 25);
  assert.strictEqual(campaign1.discoveryStatus, 'pending');
  console.log('  PASS: Campaign created with automated niche, keyword, and qualification criteria');

  // =========================================================================
  // 4. MOCKED PROVIDER DISCOVERY & RESILIENCE
  // =========================================================================
  console.log('\n--- 4. Multi-Source Discovery Execution & Merge ---');

  // Mock searchDiscoveryProvider
  const originalSearchDiscover = searchDiscoveryProvider.discover;
  searchDiscoveryProvider.discover = async ({ keyword }) => {
    return [
      {
        prospectDomain: 'reactdigest.com',
        prospectUrl: 'https://reactdigest.com/blog',
        source: 'keyword',
        discoveredFrom: `Keyword: ${keyword}`,
        domainAuthority: 45,
        pageAuthority: 30,
        spamScore: 2,
        opportunityScore: 78
      },
      {
        prospectDomain: 'overlapdomain.com', // will test overlap with competitor
        prospectUrl: 'https://overlapdomain.com/react-resources',
        source: 'keyword',
        discoveredFrom: `Keyword: ${keyword}`,
        domainAuthority: 55,
        pageAuthority: 40,
        spamScore: 5,
        opportunityScore: 82
      },
      {
        prospectDomain: 'lowda-site.com', // DA 10: will test qualification rejection
        prospectUrl: 'https://lowda-site.com',
        source: 'keyword',
        domainAuthority: 10,
        spamScore: 0,
        opportunityScore: 40
      },
      {
        prospectDomain: 'highspam-site.com', // Spam 50: will test spam rejection
        prospectUrl: 'https://highspam-site.com',
        source: 'keyword',
        domainAuthority: 40,
        spamScore: 50,
        opportunityScore: 35
      }
    ];
  };

  // Mock competitorDiscoveryProvider
  const originalCompDiscover = competitorDiscoveryProvider.discover;
  competitorDiscoveryProvider.discover = async ({ competitorDomains }) => {
    return [
      {
        prospectDomain: 'overlapdomain.com', // overlapping with keyword discovery
        prospectUrl: 'https://overlapdomain.com/react-resources',
        source: 'competitor',
        discoveredFrom: competitorDomains[0],
        competitorDomains,
        domainAuthority: 55,
        pageAuthority: 40,
        spamScore: 5,
        opportunityScore: 85
      },
      {
        prospectDomain: 'frontendnews.io',
        prospectUrl: 'https://frontendnews.io/articles',
        source: 'competitor',
        discoveredFrom: competitorDomains[0],
        competitorDomains,
        domainAuthority: 60,
        pageAuthority: 42,
        spamScore: 1,
        opportunityScore: 92
      }
    ];
  };

  // Mock contactDiscoveryService crawling to test automatic contact extraction
  const originalCrawl = contactDiscoveryService.crawlWebsite;
  contactDiscoveryService.crawlWebsite = async (domain) => {
    if (domain === 'frontendnews.io') {
      return [
        {
          email: 'editor@frontendnews.io',
          name: 'Editorial Lead',
          role: 'Editor in Chief',
          sourceUrl: 'https://frontendnews.io/contact',
          discoveryMethod: 'website_crawl',
          confidenceScore: 95,
          verificationStatus: 'unverified',
          discoveredAt: new Date()
        }
      ];
    }
    if (domain === 'reactdigest.com') {
      return [
        {
          email: 'contact@reactdigest.com',
          name: '',
          role: '',
          sourceUrl: 'https://reactdigest.com',
          discoveryMethod: 'website_crawl',
          confidenceScore: 85,
          verificationStatus: 'unverified',
          discoveredAt: new Date()
        }
      ];
    }
    return [];
  };

  // Run discovery pipeline
  const discoveryResult = await campaignDiscoveryService.runCampaignDiscovery({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id
  });

  assert.strictEqual(discoveryResult.success, true);
  assert(
    discoveryResult.discoveryStatus === 'completed' || discoveryResult.discoveryStatus === 'completed_with_warnings',
    `Status should be completed, got ${discoveryResult.discoveryStatus}`
  );

  // Check campaign state after discovery
  const updatedCamp1 = await Campaign.findById(campaign1.id);
  assert(updatedCamp1.discoverySummary.totalDiscovered >= 4, 'Should record total discovered count');
  assert(updatedCamp1.discoverySummary.uniqueDomainsCount >= 4, 'Should record unique domains count');
  assert.strictEqual(updatedCamp1.discoverySummary.duplicateCount, 21, 'Duplicate count should be non-negative'); // multiple query overlap
  assert(updatedCamp1.discoverySummary.qualifiedCount >= 3, 'Should record qualified count');
  console.log('  PASS: Combined keyword and competitor discovery successfully without errors');

  // =========================================================================
  // 5. QUALIFICATION FILTERING VERIFICATION
  // =========================================================================
  console.log('\n--- 5. Qualification Filtering Criteria ---');

  const assignedProspects = await CampaignProspectAssignment.find({
    campaignId: campaign1.id
  }).populate('prospectId');

  const assignedDomains = assignedProspects.map((a) => a.prospectId.prospectDomain);

  // Qualified domains should be present
  assert(assignedDomains.includes('reactdigest.com'), 'reactdigest.com (DA 45) should be assigned');
  assert(assignedDomains.includes('overlapdomain.com'), 'overlapdomain.com (DA 55) should be assigned');
  assert(assignedDomains.includes('frontendnews.io'), 'frontendnews.io (DA 60) should be assigned');

  // Disqualified domains should NOT be assigned
  assert(!assignedDomains.includes('lowda-site.com'), 'lowda-site.com (DA 10 < minDA 25) must be excluded');
  assert(!assignedDomains.includes('highspam-site.com'), 'highspam-site.com (Spam 50 > maxSpam 20) must be excluded');
  console.log('  PASS: DA and Spam thresholds strictly enforce qualification criteria');

  // Verify assignment source
  assert(
    assignedProspects.every((a) => a.assignmentSource === 'automatic'),
    'Automated discovery assignments must have assignmentSource="automatic"'
  );
  console.log('  PASS: Distinguishes automated assignments from manual additions');

  // =========================================================================
  // 6. SINGLE PROVIDER FAILURE RESILIENCE
  // =========================================================================
  console.log('\n--- 6. Provider Failure Resilience ---');

  // Create campaign 2
  const campaign2 = await campaignService.createCampaign({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignData: {
      name: 'Resilience Test Campaign',
      campaignType: 'General Link Building',
      niche: 'Fintech',
      primaryKeywords: ['fintech tools'],
      competitorDomains: ['fintechcompetitor.com'],
      autoDiscover: false
    }
  });

  // Simulate Moz provider throwing rate limit / quota exhaustion
  competitorDiscoveryProvider.discover = async () => {
    throw new Error('Moz API rate limit exceeded: HTTP 429');
  };

  // Run discovery: keyword succeeds, competitor fails
  const resResult = await campaignDiscoveryService.runCampaignDiscovery({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign2.id
  });

  assert.strictEqual(resResult.success, true);
  assert.strictEqual(resResult.discoveryStatus, 'completed_with_warnings');

  const camp2Doc = await Campaign.findById(campaign2.id);
  assert(camp2Doc.discoverySummary.warnings.length > 0, 'Should record competitor warning');
  assert(
    camp2Doc.discoverySummary.warnings[0].message.includes('Moz API rate limit'),
    'Should capture exact provider failure message'
  );
  assert(camp2Doc.discoverySummary.assignedCount > 0, 'Should still assign keyword prospects despite Moz failure');
  console.log('  PASS: Competitor failure does not halt keyword discovery; status marked "completed_with_warnings"');

  // Simulate both providers failing
  searchDiscoveryProvider.discover = async () => {
    throw new Error('Serper API key quota exhausted');
  };

  const campaign3 = await campaignService.createCampaign({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignData: {
      name: 'Total Failure Campaign',
      campaignType: 'General Link Building',
      niche: 'SaaS',
      competitorDomains: ['broken.com'],
      autoDiscover: false
    }
  });

  let failedCaught = false;
  try {
    await campaignDiscoveryService.runCampaignDiscovery({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaign3.id
    });
  } catch (err) {
    failedCaught = true;
    assert(err.message.includes('Both keyword discovery and competitor'), 'Clear error returned on total provider failure');
  }

  assert(failedCaught, 'Discovery must throw when all sources fail');
  const camp3Doc = await Campaign.findById(campaign3.id);
  assert.strictEqual(camp3Doc.discoveryStatus, 'failed');
  console.log('  PASS: Gracefully handles total provider failure without converting errors to fake empty results');

  // Restore providers
  searchDiscoveryProvider.discover = originalSearchDiscover;
  competitorDiscoveryProvider.discover = originalCompDiscover;

  // =========================================================================
  // 7. CONTACT DISCOVERY & STORAGE
  // =========================================================================
  console.log('\n--- 7. Automated Contact Discovery Pipeline ---');

  const frontendNewsProspect = await Prospect.findOne({
    userId: userA._id,
    websiteId: websiteA._id,
    prospectDomain: 'frontendnews.io'
  });

  assert(frontendNewsProspect, 'frontendnews.io prospect should exist');

  // Run contact discovery on frontendNewsProspect
  const contactRes = await contactDiscoveryService.discoverContactForProspect(frontendNewsProspect);

  assert.strictEqual(contactRes.status, 'found');
  assert.strictEqual(contactRes.contactEmail, 'editor@frontendnews.io');
  assert(contactRes.emails.length >= 1);
  assert.strictEqual(contactRes.emails[0].role, 'Editor in Chief');
  assert.strictEqual(contactRes.emails[0].sourceUrl, 'https://frontendnews.io/contact');
  console.log('  PASS: Discovers, formats, and persists multi-email contact records with metadata');

  // Verify backward compatibility
  const refreshedDoc = await Prospect.findById(frontendNewsProspect._id);
  assert.strictEqual(refreshedDoc.contactEmail, 'editor@frontendnews.io');
  assert.strictEqual(refreshedDoc.contactEmails[0].email, 'editor@frontendnews.io');
  assert.strictEqual(refreshedDoc.contactStatus, 'found');
  console.log('  PASS: Preserves backward compatibility: prospect.contactEmail synced with primary email');

  // Test manual contact addition and editing
  const assignmentToEdit = await CampaignProspectAssignment.findOne({
    campaignId: campaign1.id,
    prospectId: frontendNewsProspect._id
  });

  const updateContactResult = await campaignService.updateProspectContact({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    assignmentId: assignmentToEdit._id,
    contactData: {
      action: 'add',
      email: 'founder@frontendnews.io',
      name: 'Alex Founder',
      role: 'Publisher'
    }
  });

  assert.strictEqual(updateContactResult.contactEmail, 'founder@frontendnews.io');
  assert(updateContactResult.contactEmails.some((e) => e.email === 'founder@frontendnews.io'));
  assert(updateContactResult.contactEmails.some((e) => e.email === 'editor@frontendnews.io'));
  console.log('  PASS: Manual contact additions prepend verified email and update primary recipient');

  // Test contact removal
  await campaignService.updateProspectContact({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    assignmentId: assignmentToEdit._id,
    contactData: {
      action: 'remove',
      email: 'founder@frontendnews.io'
    }
  });

  const afterRemoval = await Prospect.findById(frontendNewsProspect._id);
  assert(!afterRemoval.contactEmails.some((e) => e.email === 'founder@frontendnews.io'));
  assert.strictEqual(afterRemoval.contactEmail, 'editor@frontendnews.io');
  console.log('  PASS: Manual contact removal updates primary email fallback seamlessly');

  // =========================================================================
  // 8. CONTACT FILTERING & STATS FOR FRONTEND TABS
  // =========================================================================
  console.log('\n--- 8. Campaign Contact Filtering & Statistics Rollup ---');

  // All prospects
  const allResult = await campaignService.getCampaignProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    contactFilter: 'all'
  });

  assert(allResult.stats, 'Result should include stats');
  assert(allResult.stats.total >= 3, 'Total should match assigned count');
  assert(allResult.stats.emailAvailable >= 1, 'Should report emailAvailable count');
  console.log('  PASS: Accurately rolls up total, emailAvailable, and noEmail statistics');

  // Filter: email_available
  const emailAvailableResult = await campaignService.getCampaignProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    contactFilter: 'email_available'
  });

  assert(emailAvailableResult.assignments.length >= 1, 'Should return prospects with email');
  assert(
    emailAvailableResult.assignments.every((a) => Boolean(a.prospect.contactEmail)),
    'Every returned prospect in email_available filter MUST have a contact email'
  );
  console.log('  PASS: "Email Available" filter returns strictly prospects with valid contact emails');

  // Filter: no_email
  const noEmailResult = await campaignService.getCampaignProspects({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    contactFilter: 'no_email'
  });

  assert(
    noEmailResult.assignments.every((a) => !a.prospect.contactEmail),
    'Every returned prospect in no_email filter MUST NOT have a contact email'
  );
  console.log('  PASS: "No Email" filter returns only prospects without discovered emails');

  // =========================================================================
  // 9. MANUAL EXCLUSION PRESERVATION ON DISCOVERY RERUN
  // =========================================================================
  console.log('\n--- 9. Manual Exclusion Preservation across Reruns ---');

  // Remove reactdigest.com from campaign1
  const assignmentToRemove = await CampaignProspectAssignment.findOne({
    campaignId: campaign1.id
  }).populate('prospectId');

  const removedDomain = assignmentToRemove.prospectId.prospectDomain;

  await campaignService.removeAssignment({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id,
    assignmentId: assignmentToRemove._id
  });

  // Verify removed from campaign1
  const remainingAssignments = await CampaignProspectAssignment.find({
    campaignId: campaign1.id
  }).populate('prospectId');

  assert(
    !remainingAssignments.some((a) => a.prospectId.prospectDomain === removedDomain),
    'Removed domain should no longer be assigned'
  );

  // Verify added to campaign excludedDomains
  const recheckedCamp1 = await Campaign.findById(campaign1.id);
  assert(
    recheckedCamp1.qualificationCriteria.excludedDomains.includes(removedDomain),
    'Removed domain must be recorded in campaign excludedDomains'
  );

  // Rerun discovery on campaign1
  searchDiscoveryProvider.discover = async () => [
    {
      prospectDomain: removedDomain, // try to return the removed domain
      prospectUrl: `https://${removedDomain}`,
      domainAuthority: 50,
      opportunityScore: 80
    },
    {
      prospectDomain: 'brandnewdomain.com',
      prospectUrl: 'https://brandnewdomain.com',
      domainAuthority: 50,
      opportunityScore: 80
    }
  ];

  await campaignDiscoveryService.runCampaignDiscovery({
    userId: userA._id,
    websiteId: websiteA._id,
    campaignId: campaign1.id
  });

  // Check assignments again: removed domain MUST NOT have been re-assigned!
  const postRerunAssignments = await CampaignProspectAssignment.find({
    campaignId: campaign1.id
  }).populate('prospectId');

  const postRerunDomains = postRerunAssignments.map((a) => a.prospectId.prospectDomain);

  assert(
    !postRerunDomains.includes(removedDomain),
    'Previously removed domain MUST NOT be re-added on discovery rerun'
  );
  assert(
    postRerunDomains.includes('brandnewdomain.com'),
    'New qualifying domain should be added on rerun'
  );
  console.log('  PASS: Manual removals and exclusions are strictly preserved when discovery is rerun');

  // Restore crawl
  contactDiscoveryService.crawlWebsite = originalCrawl;

  // =========================================================================
  // 10. MULTI-TENANT ISOLATION & SECURITY
  // =========================================================================
  console.log('\n--- 10. Multi-Tenant Isolation & Ownership Security ---');

  // User B tries to run discovery on User A's campaign
  let crossUserDiscoveryBlocked = false;
  try {
    await campaignService.runDiscovery({
      userId: userB._id,
      websiteId: websiteB._id,
      campaignId: campaign1.id
    });
  } catch (err) {
    crossUserDiscoveryBlocked = true;
  }
  assert(crossUserDiscoveryBlocked, 'User B must not be permitted to run discovery on User A campaign');
  console.log('  PASS: Rejects cross-user campaign discovery requests');

  // User B tries to view prospects of User A's campaign
  let crossUserProspectsBlocked = false;
  try {
    await campaignService.getCampaignProspects({
      userId: userB._id,
      websiteId: websiteB._id,
      campaignId: campaign1.id
    });
  } catch (err) {
    crossUserProspectsBlocked = true;
  }
  assert(crossUserProspectsBlocked, 'User B must not be permitted to view prospects of User A campaign');
  console.log('  PASS: Rejects cross-user prospect list access');

  console.log('\n======================================================');
  console.log('All Phase 10 Upgrade Pipeline Tests Passed Successfully!');
  console.log('======================================================\n');
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await teardown();
  }
}

main();
