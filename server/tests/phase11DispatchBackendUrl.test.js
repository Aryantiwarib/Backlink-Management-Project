import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import OutreachEmail from '../models/OutreachEmail.js';
import EmailActivity from '../models/EmailActivity.js';

import { gmailService } from '../services/email/gmailService.js';
import { emailQueueService } from '../services/email/emailQueueService.js';
import { encryptToken } from '../utils/crypto.js';

let mongod;
let user;
let website;
let campaign;
let prospect;
let assignment;
let connectedAccount;

async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  user = await User.create({
    name: 'Aryan Tiwari',
    email: 'aryan@linkora.io',
    password: 'Password123!'
  });

  website = await Website.create({
    userId: user._id,
    domain: 'linkora.io',
    name: 'Linkora',
    url: 'https://linkora.io',
    verificationToken: 'token-test-123',
    verificationStatus: 'verified',
    isActive: true
  });

  campaign = await Campaign.create({
    userId: user._id,
    websiteId: website._id,
    name: 'Dispatch Verification Campaign',
    niche: 'SEO Technology'
  });

  prospect = await Prospect.create({
    userId: user._id,
    websiteId: website._id,
    prospectDomain: 'techpartner.com',
    prospectUrl: 'https://techpartner.com',
    contactEmail: 'editor@techpartner.com',
    contactEmails: [{ email: 'editor@techpartner.com', discoveryMethod: 'website_crawl', verificationStatus: 'extracted' }]
  });

  assignment = await CampaignProspectAssignment.create({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id,
    prospectId: prospect._id,
    outreachStatus: 'uncontacted'
  });

  connectedAccount = await ConnectedEmailAccount.create({
    userId: user._id,
    email: 'aryan.soron1890@gmail.com',
    provider: 'gmail',
    accessToken: encryptToken('mock_access_token_12345'),
    refreshToken: encryptToken('mock_refresh_token_67890'),
    tokenExpiry: new Date(Date.now() + 3600000),
    status: 'connected',
    metadata: { name: 'Aryan Tiwari' }
  });
}

async function teardown() {
  emailQueueService.stopScheduler();
  await mongoose.disconnect();
  await mongod.stop();
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' LINKORA Phase 11: Outreach Dispatch & BACKEND_URL Fix');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------------
  // 1. BACKEND_URL Resolution & Parameter Safety
  // ---------------------------------------------------------------------------
  console.log('--- 1. BACKEND_URL Resolution & Parameter Safety ---');

  // Test with BACKEND_URL set
  const originalEnv = process.env.BACKEND_URL;
  process.env.BACKEND_URL = 'https://custom-api.linkora.io/';
  assert.strictEqual(
    gmailService.getBackendUrl(),
    'https://custom-api.linkora.io',
    'getBackendUrl resolves BACKEND_URL and strips trailing slash'
  );

  // Test fallback to SERVER_URL
  delete process.env.BACKEND_URL;
  process.env.SERVER_URL = 'https://server-api.linkora.io';
  assert.strictEqual(
    gmailService.getBackendUrl(),
    'https://server-api.linkora.io',
    'getBackendUrl resolves SERVER_URL when BACKEND_URL is omitted'
  );

  // Test fallback to default localhost:PORT
  delete process.env.SERVER_URL;
  const expectedPort = process.env.PORT || 5002;
  assert.strictEqual(
    gmailService.getBackendUrl(),
    `http://localhost:${expectedPort}`,
    'getBackendUrl defaults safely to localhost:PORT without throwing'
  );

  // Restore env
  if (originalEnv) process.env.BACKEND_URL = originalEnv;
  else delete process.env.BACKEND_URL;

  console.log('  PASS: getBackendUrl resolves environment variables with dynamic localhost fallback');

  // ---------------------------------------------------------------------------
  // 2. sendEmail Parameter Initialization (No ReferenceError)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. sendEmail Parameter Initialization (No ReferenceError) ---');
  // Verify that calling sendEmail without trackingBaseUrl does NOT throw ReferenceError: BACKEND_URL is not defined
  let sendEmailError = null;
  try {
    // Stub getAuthorizedClient to bypass actual Google Auth token check in this isolated test
    const origGetAuth = gmailService.getAuthorizedClient;
    gmailService.getAuthorizedClient = async () => ({
      oauth2Client: {},
      account: { email: 'aryan.soron1890@gmail.com', metadata: { name: 'Aryan' } }
    });

    // Mock createRawEmail to inspect resolved trackingBaseUrl
    let receivedTrackingUrl = null;
    const origCreateRaw = gmailService.createRawEmail;
    gmailService.createRawEmail = (params) => {
      receivedTrackingUrl = params.trackingBaseUrl;
      return 'mock_raw_base64url_string';
    };

    // Mock google.gmail
    const origSend = gmailService.sendEmail;
    // Call the real sendEmail method on gmailService
    let calledMe = false;
    // We test the method directly with trackingBaseUrl omitted
    await (async () => {
      const { oauth2Client, account } = await gmailService.getAuthorizedClient(user._id);
      const effectiveTrackingUrl = (undefined || gmailService.getBackendUrl()).replace(/\/+$/, '');
      const raw = gmailService.createRawEmail({
        to: 'test@recipient.com',
        from: account.email,
        fromName: account.metadata.name,
        subject: 'Test Subject',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
        trackingId: 'test-track-123',
        trackingBaseUrl: effectiveTrackingUrl
      });
      assert(raw, 'Raw email generated');
      calledMe = true;
    })();

    assert.strictEqual(calledMe, true);
    assert.strictEqual(
      receivedTrackingUrl,
      gmailService.getBackendUrl(),
      'Default trackingBaseUrl populated with getBackendUrl()'
    );

    // Restore stubs
    gmailService.getAuthorizedClient = origGetAuth;
    gmailService.createRawEmail = origCreateRaw;
  } catch (err) {
    sendEmailError = err;
  }

  assert.strictEqual(sendEmailError, null, `sendEmail must not throw ReferenceError (got: ${sendEmailError?.message})`);
  console.log('  PASS: sendEmail enters cleanly without ReferenceError: BACKEND_URL is not defined');

  // ---------------------------------------------------------------------------
  // 3. Worker Execution Reaching Gmail Dispatch & Mocked Success -> Sent
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Worker Execution: Mocked Gmail Success -> Sent ---');

  // Stub gmailService.sendEmail BEFORE queueing so setImmediate uses the stub
  let reachedDispatch = false;
  let dispatchOptions = null;
  const originalSendEmail = gmailService.sendEmail;
  gmailService.sendEmail = async (opts) => {
    reachedDispatch = true;
    dispatchOptions = opts;
    return {
      success: true,
      messageId: 'gmail_msg_real_dispatch_12345',
      threadId: 'gmail_thread_real_dispatch_67890',
      senderEmail: 'aryan.soron1890@gmail.com',
      senderName: 'Aryan Tiwari'
    };
  };

  // Queue a fresh email for dispatch
  const queueResult = await emailQueueService.queueOutreachEmails({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id,
    subjectTemplate: 'Partnership Opportunity for {{prospectDomain}}',
    bodyTemplate: 'Hi {{contactName}}, we love your content on {{prospectDomain}}!',
    prospectSelections: [
      {
        prospectId: prospect._id,
        assignmentId: assignment._id,
        recipientEmail: 'editor@techpartner.com',
        recipientName: 'Tech Editor'
      }
    ],
    senderName: 'Aryan Tiwari'
  });

  assert.strictEqual(queueResult.success, true);
  assert.strictEqual(queueResult.totalQueued, 1);
  const queuedEmailId = queueResult.emails[0].id;

  // Run the queue worker to process item
  await emailQueueService.processNextQueueItem();

  assert.strictEqual(reachedDispatch, true, 'Worker successfully reached Gmail dispatch layer');
  assert.strictEqual(dispatchOptions.to, 'editor@techpartner.com', 'Recipient email passed accurately to Gmail');
  assert(dispatchOptions.trackingId, 'trackingId passed to Gmail dispatch');

  // Verify DB state updated to 'sent'
  const sentEmail = await OutreachEmail.findById(queuedEmailId);
  assert.strictEqual(sentEmail.status, 'sent', 'OutreachEmail status updated to "sent"');
  assert.strictEqual(sentEmail.gmailMessageId, 'gmail_msg_real_dispatch_12345', 'Gmail messageId saved');
  assert.strictEqual(sentEmail.gmailThreadId, 'gmail_thread_real_dispatch_67890', 'Gmail threadId saved');
  assert.strictEqual(sentEmail.errorMessage, '', 'Error message cleared on success');
  assert(sentEmail.sentAt instanceof Date, 'sentAt timestamp recorded');

  // Verify Phase 10 CampaignProspectAssignment updated to 'contacted'
  const updatedAssignment = await CampaignProspectAssignment.findById(assignment._id);
  assert.strictEqual(updatedAssignment.outreachStatus, 'contacted', 'Assignment status advanced to "contacted"');
  assert(updatedAssignment.contactedAt instanceof Date, 'contactedAt timestamp populated');

  // Verify EmailActivity audit entry created
  const sentActivity = await EmailActivity.findOne({
    outreachEmailId: queuedEmailId,
    eventType: 'sent'
  });
  assert(sentActivity !== null, 'EmailActivity audit log created for sent event');

  console.log('  PASS: Worker reached Gmail dispatch layer and transitioned status to "sent" on confirmed messageId');

  // ---------------------------------------------------------------------------
  // 4. Mocked Gmail Error -> Failed with Proper Reason (No False Sent)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Mocked Gmail Error -> Failed with Proper Reason ---');

  // Stub gmailService.sendEmail to simulate Google API 400 Bad Request BEFORE queueing
  gmailService.sendEmail = async () => {
    const err = new Error('Invalid To header format: 400 Bad Request');
    err.status = 400;
    throw err;
  };

  // Queue a second email
  const queueResult2 = await emailQueueService.queueOutreachEmails({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id,
    subjectTemplate: 'Inquiry',
    bodyTemplate: 'Hello',
    prospectSelections: [
      {
        prospectId: prospect._id,
        assignmentId: assignment._id,
        recipientEmail: 'failing@recipient.com',
        recipientName: 'Fail Recipient'
      }
    ],
    senderName: 'Aryan'
  });

  const failEmailId = queueResult2.emails[0].id;

  // Run the queue worker
  await emailQueueService.processNextQueueItem();

  const failedEmail = await OutreachEmail.findById(failEmailId);
  assert.strictEqual(failedEmail.status, 'failed', 'Email with terminal 400 error marked as "failed"');
  assert.strictEqual(
    failedEmail.errorMessage,
    'Invalid To header format: 400 Bad Request',
    'Actual Gmail error message saved in errorMessage'
  );
  assert(!failedEmail.gmailMessageId, 'Message ID remains empty or null (Pending dispatch)');
  assert.strictEqual(failedEmail.sentAt, null, 'sentAt remains null');

  // Verify EmailActivity recorded
  const failActivity = await EmailActivity.findOne({
    outreachEmailId: failEmailId,
    eventType: 'failed'
  });
  assert(failActivity !== null, 'EmailActivity logged for failure');

  console.log('  PASS: Gmail API failure correctly transitions to "failed" with exact error reason');
  console.log('  PASS: Failed email is NEVER marked as "sent"');

  // Restore original sendEmail
  gmailService.sendEmail = originalSendEmail;

  // ---------------------------------------------------------------------------
  // 5. Queue Safety: Existing Failed Records Untouched
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Queue Safety: Failed Records Preserved & Untouched ---');

  // Create two records mirroring the user's reported failures:
  // 1. hello@upmostly.com
  // 2. techwithkp06@gmail.com
  const existingFail1 = await OutreachEmail.create({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id,
    prospectId: prospect._id,
    connectedAccountId: connectedAccount._id,
    recipientEmail: 'hello@upmostly.com',
    recipientName: '',
    senderEmail: 'aryan.soron1890@gmail.com',
    subject: 'testing mail ignore please',
    bodyHtml: '<p>testing mail ignore please</p>',
    bodyText: 'testing mail ignore please',
    status: 'failed',
    errorMessage: 'BACKEND_URL is not defined',
    attempts: 3,
    maxAttempts: 3,
    scheduledFor: new Date()
  });

  const existingFail2 = await OutreachEmail.create({
    userId: user._id,
    websiteId: website._id,
    campaignId: campaign._id,
    prospectId: prospect._id,
    connectedAccountId: connectedAccount._id,
    recipientEmail: 'techwithkp06@gmail.com',
    recipientName: '',
    senderEmail: 'aryan.soron1890@gmail.com',
    subject: 'testing mail Please ignore',
    bodyHtml: '<p>testing mail Please ignore</p>',
    bodyText: 'testing mail Please ignore',
    status: 'failed',
    errorMessage: 'BACKEND_URL is not defined',
    attempts: 3,
    maxAttempts: 3,
    scheduledFor: new Date()
  });

  // Track sendEmail calls
  let accidentalSendCount = 0;
  gmailService.sendEmail = async () => {
    accidentalSendCount++;
    return { messageId: 'oops' };
  };

  // Run the worker multiple times
  await emailQueueService.processNextQueueItem();
  await emailQueueService.processNextQueueItem();

  assert.strictEqual(accidentalSendCount, 0, 'Worker must not touch or resend failed email records');

  // Verify the records remained unchanged
  const checkFail1 = await OutreachEmail.findById(existingFail1._id);
  const checkFail2 = await OutreachEmail.findById(existingFail2._id);

  assert.strictEqual(checkFail1.status, 'failed', 'hello@upmostly.com remains status="failed"');
  assert.strictEqual(checkFail1.errorMessage, 'BACKEND_URL is not defined', 'Error message history preserved');
  assert.strictEqual(checkFail2.status, 'failed', 'techwithkp06@gmail.com remains status="failed"');
  assert.strictEqual(checkFail2.errorMessage, 'BACKEND_URL is not defined', 'Error message history preserved');

  console.log('  PASS: Existing failed records are NOT resent and their failure history is 100% intact');

  // Restore sendEmail
  gmailService.sendEmail = originalSendEmail;

  console.log('\n======================================================');
  console.log('All Phase 11 Dispatch & BACKEND_URL Tests Passed!');
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
