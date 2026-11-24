import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import { assignProspects } from '../controllers/campaignController.js';
import { campaignService } from '../services/campaignService.js';

let mongo;

async function run() {
  console.log('\n======================================================');
  console.log('   LINKORA: Prospect Selection & Assignment Tests   ');
  console.log('======================================================\n');

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

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

  // 1. Seed User, Website, Campaign, and Prospects
  const user = await User.create({
    name: 'Assign Tester',
    email: 'assigntest@linkora.io',
    password: 'password123'
  });

  const website = await Website.create({
    userId: user._id,
    name: 'Linkora Test Site',
    domain: 'linkoratest.com',
    url: 'https://linkoratest.com',
    verificationStatus: 'verified',
    verificationToken: 'token-assign-123'
  });

  const campaign = await Campaign.create({
    userId: user._id,
    websiteId: website._id,
    name: 'Q4 Outreach Sprint',
    campaignType: 'Guest Posting',
    targetBacklinks: 10,
    status: 'active'
  });

  const p1 = await Prospect.create({
    userId: user._id,
    websiteId: website._id,
    prospectDomain: 'techradar.com',
    prospectUrl: 'https://techradar.com/news',
    domainAuthority: 88,
    opportunityScore: 91,
    status: 'saved'
  });

  const p2 = await Prospect.create({
    userId: user._id,
    websiteId: website._id,
    prospectDomain: 'wired.com',
    prospectUrl: 'https://wired.com/story',
    domainAuthority: 92,
    opportunityScore: 95,
    status: 'qualified'
  });

  const p3 = await Prospect.create({
    userId: user._id,
    websiteId: website._id,
    prospectDomain: 'theverge.com',
    prospectUrl: 'https://theverge.com/tech',
    domainAuthority: 90,
    opportunityScore: 93,
    status: 'saved'
  });

  const p4 = await Prospect.create({
    userId: user._id,
    websiteId: website._id,
    prospectDomain: 'mashable.com',
    prospectUrl: 'https://mashable.com/article',
    domainAuthority: 85,
    opportunityScore: 87,
    status: 'saved'
  });

  // Helper mock response
  let resCode, resJson;
  const mockRes = () => ({
    status(code) { resCode = code; return this; },
    json(data) { resJson = data; return this; }
  });

  // -------------------------------------------------------------
  // Test 1: Deselect everything (empty array) -> validation error
  // -------------------------------------------------------------
  console.log('\n--- 1. Validation on Empty Prospect Selection ---');
  let emptyErr;
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: { prospectIds: [], notes: '' }
    },
    mockRes(),
    (err) => { emptyErr = err; }
  );
  assert(
    emptyErr && emptyErr.status === 400 && emptyErr.message === 'Please select at least one prospect to assign.',
    'Rejects empty prospect selection with 400 "Please select at least one prospect to assign."'
  );

  // Missing prospectIds field entirely
  let missingErr;
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: { notes: 'No IDs included' }
    },
    mockRes(),
    (err) => { missingErr = err; }
  );
  assert(
    missingErr && missingErr.status === 400,
    'Rejects payload when prospectIds is missing or undefined'
  );

  // -------------------------------------------------------------
  // Test 2: Select ONE prospect and assign it
  // -------------------------------------------------------------
  console.log('\n--- 2. Single Prospect Assignment ---');
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: {
        prospectIds: [p1._id.toString()],
        notes: 'Targeting editorial team'
      }
    },
    mockRes(),
    (err) => { console.error('Unexpected err:', err); }
  );
  assert(resCode === 200 && resJson.assignedCount === 1, 'Assigns single prospect (p1) successfully');

  const p1Assigned = await CampaignProspectAssignment.findOne({
    campaignId: campaign._id,
    prospectId: p1._id
  });
  assert(
    p1Assigned && p1Assigned.notes === 'Targeting editorial team' && p1Assigned.outreachStatus === 'uncontacted',
    'Persists single assignment with correct default outreachStatus and notes'
  );

  // -------------------------------------------------------------
  // Test 3: Select MULTIPLE prospects and assign them
  // -------------------------------------------------------------
  console.log('\n--- 3. Multiple Prospect Assignment ---');
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: {
        prospectIds: [p2._id.toString(), p3._id.toString()],
        notes: 'Batch 2 outreach'
      }
    },
    mockRes(),
    (err) => { console.error('Unexpected err:', err); }
  );
  assert(resCode === 200 && resJson.assignedCount === 2, 'Assigns multiple prospects (p2, p3) in a single batch');

  const totalAssigned3 = await CampaignProspectAssignment.countDocuments({
    campaignId: campaign._id
  });
  assert(totalAssigned3 === 3, 'Total assignments in campaign is now 3');

  // -------------------------------------------------------------
  // Test 4: Duplicate Assignment Prevention
  // -------------------------------------------------------------
  console.log('\n--- 4. Duplicate Campaign Assignment Prevention ---');
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: {
        prospectIds: [p1._id.toString()], // p1 already assigned
        notes: 'Attempting duplicate'
      }
    },
    mockRes(),
    (err) => { console.error('Unexpected err:', err); }
  );
  assert(
    resCode === 200 && resJson.assignedCount === 0 && resJson.duplicateCount === 1,
    'Skips already-assigned prospect (p1) without duplicating'
  );

  const totalStill3 = await CampaignProspectAssignment.countDocuments({
    campaignId: campaign._id
  });
  assert(totalStill3 === 3, 'Count in database strictly remains 3 (no duplicate rows)');

  // -------------------------------------------------------------
  // Test 5: Partial Selection (p4 is new, p2 is duplicate)
  // -------------------------------------------------------------
  console.log('\n--- 5. Partial Selection with Deduplication ---');
  await assignProspects(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString(), campaignId: campaign._id.toString() },
      body: {
        prospectIds: [p2._id.toString(), p4._id.toString()], // p2 duplicate, p4 new
        notes: 'Partial batch'
      }
    },
    mockRes(),
    (err) => { console.error('Unexpected err:', err); }
  );
  assert(
    resCode === 200 && resJson.assignedCount === 1 && resJson.duplicateCount === 1,
    'Assigns new prospect (p4) and gracefully skips duplicate (p2)'
  );

  const finalCount = await CampaignProspectAssignment.countDocuments({
    campaignId: campaign._id
  });
  assert(finalCount === 4, 'Total assigned prospects is exactly 4');

  // -------------------------------------------------------------
  // Test 6: Verify Campaign Prospects Retrieval
  // -------------------------------------------------------------
  console.log('\n--- 6. Verify Assigned Prospects Appear in Campaign ---');
  const campaignProspectsRes = await campaignService.getCampaignProspects({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id
  });
  assert(
    campaignProspectsRes.assignments.length === 4,
    'Retrieves all 4 assigned prospects with populated domain and metrics'
  );
  const assignedDomains = campaignProspectsRes.assignments.map(
    (a) => a.prospect?.prospectDomain
  );
  assert(
    assignedDomains.includes('techradar.com') &&
    assignedDomains.includes('wired.com') &&
    assignedDomains.includes('theverge.com') &&
    assignedDomains.includes('mashable.com'),
    'All selected domains accurately appear in the campaign prospects list'
  );

  // -------------------------------------------------------------
  // Test 7: Client Payload Adapter Compatibility
  // -------------------------------------------------------------
  console.log('\n--- 7. Client Adapter Compatibility Simulation ---');
  // Simulates handleAssignProspects with the dual signature adapter
  const adapterTest = async (payloadOrIds, maybeNotes) => {
    let prospectIds = [];
    let notes = '';

    if (Array.isArray(payloadOrIds)) {
      prospectIds = payloadOrIds;
      notes = typeof maybeNotes === 'string' ? maybeNotes : '';
    } else if (payloadOrIds && typeof payloadOrIds === 'object') {
      prospectIds = Array.isArray(payloadOrIds.prospectIds)
        ? payloadOrIds.prospectIds
        : Array.isArray(payloadOrIds.ids)
        ? payloadOrIds.ids
        : [];
      notes = payloadOrIds.notes || '';
    }

    const cleanedIds = prospectIds
      .map((p) => String(p?._id || p?.id || p || ''))
      .filter((id) => id.length > 0);

    return { cleanedIds, notes };
  };

  // Case A: Passed as { prospectIds: ['id1', 'id2'], notes: 'test' }
  const resA = await adapterTest({ prospectIds: ['abc', 'def'], notes: 'testA' });
  assert(resA.cleanedIds.length === 2 && resA.notes === 'testA', 'Adapter handles { prospectIds, notes } object');

  // Case B: Passed as (['id1', 'id2'], 'testB')
  const resB = await adapterTest(['abc', 'def'], 'testB');
  assert(resB.cleanedIds.length === 2 && resB.notes === 'testB', 'Adapter handles (idsArray, notes) dual arguments');

  // Case C: Passed as array of objects [{ _id: 'abc' }, { id: 'def' }]
  const resC = await adapterTest([{ _id: 'abc' }, { id: 'def' }]);
  assert(resC.cleanedIds[0] === 'abc' && resC.cleanedIds[1] === 'def', 'Adapter normalizes object IDs to strings');

  // Case D: Empty array or null
  const resD = await adapterTest([]);
  assert(resD.cleanedIds.length === 0, 'Adapter returns empty array on empty selection');

  await mongoose.disconnect();
  await mongo.stop();

  console.log('\n======================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during assignment testing:', err);
  process.exit(1);
});
