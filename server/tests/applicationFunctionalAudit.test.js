import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { campaignService } from '../services/campaignService.js';
import { campaignDiscoveryService } from '../services/discovery/campaignDiscoveryService.js';
import { contactDiscoveryService } from '../services/discovery/contactDiscoveryService.js';
import { prospectService } from '../services/discovery/prospectService.js';
import { emailQueueService } from '../services/email/emailQueueService.js';
import Campaign from '../models/Campaign.js';
import Website from '../models/Website.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import OutreachEmail from '../models/OutreachEmail.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';

let mongod;
let testUser;
let testWebsite;
let otherUser;

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  testUser = { _id: new mongoose.Types.ObjectId() };
  otherUser = { _id: new mongoose.Types.ObjectId() };

  testWebsite = await Website.create({
    userId: testUser._id,
    domain: 'mybrand.com',
    url: 'https://mybrand.com',
    name: 'My Brand Store',
    verificationToken: 'token-audit-123',
    verificationStatus: 'verified'
  });
});

after(async () => {
  if (emailQueueService.intervalId) {
    clearInterval(emailQueueService.intervalId);
  }
  await mongoose.disconnect();
  await mongod.stop();
});

describe('LINKORA — Application-Wide Functional Audit & Fixes', () => {
  let testCampaign;
  let testProspect;
  let testAssignment;

  it('1. Campaign Creation and initial metrics', async () => {
    testCampaign = await campaignService.createCampaign({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignData: {
        name: 'SaaS Outreach Q1',
        description: 'Target high-authority tech blogs',
        campaignType: 'Guest Posting',
        targetBacklinks: 20
      }
    });

    assert.ok(testCampaign.id || testCampaign._id);
    assert.equal(testCampaign.status, 'active');
  });

  it('2. Campaign Status Transition to Paused preserves metrics', async () => {
    const paused = await campaignService.updateCampaignStatus({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: testCampaign.id || testCampaign._id,
      status: 'paused'
    });

    assert.equal(paused.status, 'paused');
    assert.ok(paused.metrics, 'Metrics object must be returned in safe object');
    assert.equal(typeof paused.metrics.totalAssigned, 'number');
    assert.equal(typeof paused.metrics.acquiredCount, 'number');
    assert.equal(typeof paused.metrics.progressPercentage, 'number');
    assert.ok(paused.metrics.statusBreakdown);
  });

  it('3. Paused Campaign blocks discovery and contact discovery', async () => {
    const campId = testCampaign.id || testCampaign._id;

    await assert.rejects(
      async () => {
        await campaignDiscoveryService.runCampaignDiscovery({
          userId: testUser._id,
          websiteId: testWebsite._id,
          campaignId: campId
        });
      },
      (err) => {
        assert.ok(err.message.includes('paused'));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await contactDiscoveryService.runCampaignContactDiscovery({
          userId: testUser._id,
          websiteId: testWebsite._id,
          campaignId: campId
        });
      },
      (err) => {
        assert.ok(err.message.includes('paused'));
        return true;
      }
    );
  });

  it('4. Resuming Campaign re-enables active state and preserves metrics', async () => {
    const resumed = await campaignService.updateCampaignStatus({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: testCampaign.id || testCampaign._id,
      status: 'active'
    });

    assert.equal(resumed.status, 'active');
    assert.ok(resumed.metrics);
  });

  it('5. Editing Campaign persists in MongoDB and returns populated metrics', async () => {
    const updated = await campaignService.updateCampaign({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: testCampaign.id || testCampaign._id,
      updateData: {
        name: 'SaaS Outreach Q1 - Updated',
        description: 'New strategy description',
        targetBacklinks: 30
      }
    });

    assert.equal(updated.name, 'SaaS Outreach Q1 - Updated');
    assert.equal(updated.targetBacklinks, 30);
    assert.ok(updated.metrics);
    assert.equal(updated.metrics.targetBacklinks, 30);

    const reloaded = await Campaign.findById(testCampaign.id || testCampaign._id);
    assert.equal(reloaded.name, 'SaaS Outreach Q1 - Updated');
  });

  it('6. Prospect Creation & Prospect Note Updates', async () => {
    testProspect = await Prospect.create({
      userId: testUser._id,
      websiteId: testWebsite._id,
      prospectDomain: 'techradar.com',
      prospectUrl: 'https://techradar.com/blog',
      domainAuthority: 85,
      pageAuthority: 70,
      notes: 'Initial editorial angle'
    });

    const updated = await prospectService.updateProspect({
      userId: testUser._id,
      websiteId: testWebsite._id,
      prospectId: testProspect._id,
      notes: 'Updated strategy: pitch article on modern web performance'
    });

    assert.equal(updated.notes, 'Updated strategy: pitch article on modern web performance');

    const inDb = await Prospect.findById(testProspect._id);
    assert.equal(inDb.notes, 'Updated strategy: pitch article on modern web performance');
  });

  it('7. Adding Contact Email to Prospect syncs to contactEmails array without duplicates', async () => {
    const updated = await prospectService.updateProspect({
      userId: testUser._id,
      websiteId: testWebsite._id,
      prospectId: testProspect._id,
      contactEmail: 'Editor@TechRadar.com'
    });

    assert.equal(updated.contactEmail, 'editor@techradar.com');
    assert.ok(Array.isArray(updated.contactEmails));
    assert.equal(updated.contactEmails.length, 1);
    assert.equal(updated.contactEmails[0].email, 'editor@techradar.com');
    assert.equal(updated.contactStatus, 'found');

    // Updating again with same email does not duplicate
    const updatedAgain = await prospectService.updateProspect({
      userId: testUser._id,
      websiteId: testWebsite._id,
      prospectId: testProspect._id,
      contactEmail: 'editor@techradar.com'
    });

    assert.equal(updatedAgain.contactEmails.length, 1);
  });

  it('8. Campaign Prospect Assignment and distinction between Prospect Notes vs Assignment Notes', async () => {
    const campId = testCampaign.id || testCampaign._id;
    await campaignService.assignProspects({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campId,
      prospectIds: [testProspect._id],
      notes: 'Campaign outreach: follow up within 3 days'
    });

    const { assignments } = await campaignService.getCampaignProspects({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campId
    });

    assert.equal(assignments.length, 1);
    testAssignment = assignments[0];

    // Campaign notes vs Prospect notes
    assert.equal(testAssignment.notes, 'Campaign outreach: follow up within 3 days');
    assert.equal(testAssignment.prospect.notes, 'Updated strategy: pitch article on modern web performance');
    assert.equal(testAssignment.prospect.contactEmail, 'editor@techradar.com');
  });

  it('9. Updating Assignment can atomically update both assignment notes and prospect notes', async () => {
    const campId = testCampaign.id || testCampaign._id;
    const assignId = testAssignment.id || testAssignment._id;

    const res = await campaignService.updateAssignment({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campId,
      assignmentId: assignId,
      updateData: {
        notes: 'Revised campaign pitch notes',
        prospectNotes: 'Revised global domain notes'
      }
    });

    assert.equal(res.notes, 'Revised campaign pitch notes');
    assert.equal(res.prospect.notes, 'Revised global domain notes');

    // Verify in database collections independently
    const assignmentInDb = await CampaignProspectAssignment.findById(assignId);
    assert.equal(assignmentInDb.notes, 'Revised campaign pitch notes');

    const prospectInDb = await Prospect.findById(testProspect._id);
    assert.equal(prospectInDb.notes, 'Revised global domain notes');
  });

  it('10. Marking Campaign Complete transitions status and blocks new discovery/outreach', async () => {
    const campId = testCampaign.id || testCampaign._id;

    const completed = await campaignService.updateCampaignStatus({
      userId: testUser._id,
      websiteId: testWebsite._id,
      campaignId: campId,
      status: 'completed'
    });

    assert.equal(completed.status, 'completed');
    assert.ok(completed.metrics);

    await assert.rejects(
      async () => {
        await campaignDiscoveryService.runCampaignDiscovery({
          userId: testUser._id,
          websiteId: testWebsite._id,
          campaignId: campId
        });
      },
      (err) => {
        assert.ok(err.message.includes('completed'));
        return true;
      }
    );
  });
});
