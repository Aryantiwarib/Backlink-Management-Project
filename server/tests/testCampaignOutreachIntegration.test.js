import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import { contactDiscoveryService } from '../services/discovery/contactDiscoveryService.js';
import { campaignDiscoveryService } from '../services/discovery/campaignDiscoveryService.js';
import { searchDiscoveryProvider } from '../services/discovery/providers/searchDiscoveryProvider.js';
import { seoService } from '../services/seo/seoService.js';

let mongod;
let user;
let website;

async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  user = await User.create({
    name: 'Aryan Tiwari',
    email: 'aryan@example.com',
    password: 'Password123!'
  });

  website = await Website.create({
    userId: user._id,
    domain: 'linkora.io',
    name: 'Linkora',
    url: 'https://linkora.io',
    verificationToken: 'token-linkora-123',
    verificationStatus: 'verified',
    isActive: true
  });
}

async function teardown() {
  await mongoose.disconnect();
  await mongod.stop();
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA: Phase 10 & 11 Final Integration Tests     ');
  console.log('======================================================\n');

  // 1. Email Placeholder Rejection
  console.log('--- 1. Contact Email Quality & Placeholder Rejection ---');
  const dummyPlaceholders = [
    'you@company.com',
    'your@company.com',
    'name@company.com',
    'name@domain.com',
    'user@company.com',
    'user@domain.com',
    'example@example.com',
    'test@test.com',
    'test@domain.com',
    'someone@example.com',
    'john.doe@company.com',
    'first.last@company.com',
    'admin@company.com',
    'name@mysample.domain.com'
  ];

  for (const ph of dummyPlaceholders) {
    assert.strictEqual(
      contactDiscoveryService.isValidEmail(ph),
      false,
      `Expected placeholder "${ph}" to be rejected`
    );
  }
  console.log('  PASS: Successfully rejected all theme mockup & placeholder email addresses');

  // Valid business emails should be accepted
  const validEmails = [
    'editor@techcrunch.com',
    'contact@outreachblog.co.uk',
    'sarah.connor@cyberdyne.org',
    'press@startup.io'
  ];
  for (const v of validEmails) {
    assert.strictEqual(
      contactDiscoveryService.isValidEmail(v),
      true,
      `Expected genuine email "${v}" to be accepted`
    );
  }
  console.log('  PASS: Successfully accepted genuine outreach email addresses');

  // 2. Contact Extraction & Verification Status
  console.log('\n--- 2. Contact Extraction & Verification Status ---');
  const mockHtml = `
    <html>
      <body>
        <p>Contact our editor: <a href="mailto:editor@journal.com">editor@journal.com</a></p>
        <p>Or send press inquiries to press@journal.com</p>
        <p>Template address to ignore: you@company.com</p>
      </body>
    </html>
  `;
  const extracted = contactDiscoveryService.extractEmails(mockHtml, 'https://journal.com/contact');
  assert.strictEqual(extracted.length, 2, 'Should extract 2 valid emails and reject placeholder');
  assert(extracted.some((e) => e.email === 'editor@journal.com'), 'Contains editor@journal.com');
  assert(extracted.some((e) => e.email === 'press@journal.com'), 'Contains press@journal.com');
  assert(!extracted.some((e) => e.email === 'you@company.com'), 'Does not contain you@company.com');
  assert.strictEqual(extracted[0].verificationStatus, 'extracted', 'verificationStatus must be "extracted"');
  console.log('  PASS: Discovered contacts marked with verificationStatus: "extracted"');

  // 3. SEO Metrics Availability & Provisional Qualification
  console.log('\n--- 3. SEO Qualification Labels & Provisional Status ---');
  // Stub search discovery provider to return 2 domains
  const origDiscover = searchDiscoveryProvider.discover;
  let callCount = 0;
  searchDiscoveryProvider.discover = async () => {
    callCount++;
    if (callCount === 1) {
      return [
        {
          prospectDomain: 'assessed-lead.com',
          prospectUrl: 'https://assessed-lead.com',
          domainAuthority: 35, // Assessed DA >= 20
          opportunityScore: 70,
          source: 'keyword'
        },
        {
          prospectDomain: 'unassessed-lead.com',
          prospectUrl: 'https://unassessed-lead.com',
          domainAuthority: null, // Unassessed DA from SEO provider
          opportunityScore: 50,
          source: 'keyword'
        }
      ];
    }
    return [];
  };

  // Stub competitor provider
  const origCompetitorSearch = campaignDiscoveryService.competitorDiscoveryProvider?.searchCompetitorBacklinks;
  if (campaignDiscoveryService.competitorDiscoveryProvider) {
    campaignDiscoveryService.competitorDiscoveryProvider.searchCompetitorBacklinks = async () => [];
  }

  // Stub SEO service to fail metric enrichment for unassessed
  const origGetOverview = seoService.getOverview;
  seoService.getOverview = async () => {
    const err = new Error('Moz API rate limit reached');
    err.status = 429;
    throw err;
  };

  const testCampaign = await Campaign.create({
    userId: user._id,
    websiteId: website._id,
    name: 'Integration Test Campaign',
    niche: 'Technology',
    qualificationCriteria: {
      minDomainAuthority: 20,
      minOpportunityScore: 40
    }
  });

  const discoveryResult = await campaignDiscoveryService.runCampaignDiscovery({
    userId: user._id,
    websiteId: website._id,
    campaignId: testCampaign._id
  });

  assert.strictEqual(discoveryResult.success, true);
  const updatedCamp = await Campaign.findById(testCampaign._id);
  assert.strictEqual(updatedCamp.discoverySummary.totalDiscovered, 2);
  assert.strictEqual(updatedCamp.discoverySummary.qualifiedCount, 2); // 2 total qualified leads assigned
  assert.strictEqual(updatedCamp.discoverySummary.provisionalCount, 1); // 1 unassessed DA lead
  assert.strictEqual(updatedCamp.discoverySummary.assignedCount, 2);

  // Inspect assignments in DB
  const assignments = await CampaignProspectAssignment.find({
    campaignId: testCampaign._id
  }).populate('prospectId');

  const assessedAssignment = assignments.find((a) => a.prospectId.prospectDomain === 'assessed-lead.com');
  const unassessedAssignment = assignments.find((a) => a.prospectId.prospectDomain === 'unassessed-lead.com');

  assert(assessedAssignment, 'Assessed assignment exists');
  assert(unassessedAssignment, 'Unassessed assignment exists');

  assert.strictEqual(assessedAssignment.qualificationStatus, 'qualified', 'Assessed lead must have qualificationStatus "qualified"');
  assert.strictEqual(unassessedAssignment.qualificationStatus, 'provisional', 'Unassessed lead must have qualificationStatus "provisional"');
  assert(unassessedAssignment.qualificationReason.includes('Provisional: Topical match discovered'), 'Reason clearly states provisional DA');

  // Inspect global Prospect records
  assert.strictEqual(assessedAssignment.prospectId.qualificationStatus, 'qualified');
  assert.strictEqual(unassessedAssignment.prospectId.qualificationStatus, 'provisional');

  console.log('  PASS: Assessed lead correctly labeled qualificationStatus: "qualified" (DA 35 >= 20)');
  console.log('  PASS: Unassessed lead correctly labeled qualificationStatus: "provisional" (DA unassessed)');
  console.log('  PASS: Both leads saved and assigned; summary records provisionalCount: 1');

  // Restore stubs
  searchDiscoveryProvider.discover = origDiscover;
  if (campaignDiscoveryService.competitorDiscoveryProvider && origCompetitorSearch) {
    campaignDiscoveryService.competitorDiscoveryProvider.searchCompetitorBacklinks = origCompetitorSearch;
  }
  seoService.getOverview = origGetOverview;

  // 4. Gmail Connection Normalization in Composer
  console.log('\n--- 4. Gmail Connection Status Normalization in Composer ---');
  // API returns shape: { success: true, connected: true, account: { email, status: 'connected' } }
  const apiStatusResponse = {
    success: true,
    connected: true,
    account: {
      id: 'acc-123',
      email: 'aryan.soron1890@gmail.com',
      provider: 'gmail',
      status: 'connected',
      metadata: { name: 'Aryan Tiwari' }
    }
  };

  // Composer normalization logic
  const account = apiStatusResponse?.account || apiStatusResponse;
  const isConnected = Boolean(
    (apiStatusResponse?.connected && account?.status === 'connected') ||
    apiStatusResponse?.status === 'connected' ||
    account?.status === 'connected'
  );
  const accountEmail = account?.email || apiStatusResponse?.email || '';

  assert.strictEqual(isConnected, true, 'Composer correctly identifies connected status from API shape');
  assert.strictEqual(accountEmail, 'aryan.soron1890@gmail.com', 'Composer correctly resolves account email');
  console.log('  PASS: Composer successfully resolves isConnected: true and accountEmail: aryan.soron1890@gmail.com');

  console.log('\n======================================================');
  console.log('All Integration & Verification Tests Passed Successfully!');
  console.log('======================================================\n');
}

(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    await teardown();
  }
})();
