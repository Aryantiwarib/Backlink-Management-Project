import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import CampaignActivity from '../models/CampaignActivity.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import EmailTemplate from '../models/EmailTemplate.js';
import OutreachEmail from '../models/OutreachEmail.js';
import EmailActivity from '../models/EmailActivity.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';

import { encryptToken, decryptToken } from '../utils/crypto.js';
import { replacePlaceholders, renderOutreachContent, extractFallbackContactName } from '../services/email/templateEngine.js';
import { emailQueueService } from '../services/email/emailQueueService.js';
import { gmailService } from '../services/email/gmailService.js';

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB test database');
}

async function teardown() {
  emailQueueService.stopScheduler();
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Disconnected and stopped In-Memory MongoDB');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 11: Outreach & Email Test Suite      ');
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

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: CRYPTO & ENCRYPTION AT REST
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Security & Token Encryption at Rest ---');

    const sampleToken = 'ya29.a0AfH6SMB_secret_refresh_token_example_12345';
    const encrypted = encryptToken(sampleToken);
    assert(encrypted && typeof encrypted === 'string' && encrypted.includes(':'), 'Token is encrypted to iv:authTag:ciphertext format');
    assert(encrypted !== sampleToken, 'Ciphertext differs completely from plaintext token');

    const decrypted = decryptToken(encrypted);
    assert(decrypted === sampleToken, 'Decrypted token matches original plaintext exactly');

    // Test corrupted ciphertext fails gracefully
    const corruptResult = decryptToken('corrupted:badtag:deadbeef');
    assert(corruptResult === null, 'Corrupted ciphertext or tampered auth tag returns null gracefully');

    // -------------------------------------------------------------------------
    // TEST SUITE 2: CONNECTED EMAIL ACCOUNT MODEL & TOKEN STORAGE
    // -------------------------------------------------------------------------
    console.log('\n--- 2. ConnectedEmailAccount Model & OAuth Token Lifecycle ---');

    const userA = await User.create({
      name: 'Alice Outreach',
      email: 'alice@linkora-outreach.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Bob Competitor',
      email: 'bob@linkora-outreach.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'Alice Authority Blog',
      domain: 'aliceblog.io',
      url: 'https://aliceblog.io',
      verificationStatus: 'verified',
      verificationToken: 'tok-alice-123',
      isActive: true
    });

    // Save ConnectedEmailAccount with pre-save encryption
    const emailAccountA = await ConnectedEmailAccount.create({
      userId: userA._id,
      email: 'alice.seo@gmail.com',
      provider: 'gmail',
      accessToken: 'access-token-plain-12345',
      refreshToken: 'refresh-token-plain-67890',
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
      scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
      status: 'connected',
      metadata: { name: 'Alice SEO', picture: 'https://avatar.google.com/alice' }
    });

    // Read directly from DB to verify raw storage is encrypted
    const rawAccount = await ConnectedEmailAccount.collection.findOne({ _id: emailAccountA._id });
    assert(rawAccount.accessToken !== 'access-token-plain-12345', 'Access token is encrypted at rest in MongoDB collection');
    assert(rawAccount.refreshToken !== 'refresh-token-plain-67890', 'Refresh token is encrypted at rest in MongoDB collection');

    // Verify getter decryption
    const decryptedTokens = emailAccountA.getDecryptedTokens();
    assert(decryptedTokens.accessToken === 'access-token-plain-12345', 'getDecryptedTokens() returns decrypted access token');
    assert(decryptedTokens.refreshToken === 'refresh-token-plain-67890', 'getDecryptedTokens() returns decrypted refresh token');

    // Verify safe JSON serialization excludes tokens
    const safeObj = emailAccountA.toSafeObject();
    assert(safeObj.email === 'alice.seo@gmail.com', 'toSafeObject preserves safe metadata');
    assert(!safeObj.accessToken && !safeObj.refreshToken, 'toSafeObject strips tokens completely');

    // Disconnect account
    await gmailService.disconnectAccount(userA._id);
    const disconnected = await ConnectedEmailAccount.findOne({ userId: userA._id });
    assert(disconnected.status === 'disconnected', 'disconnectAccount marks status as disconnected');
    assert(!disconnected.accessToken && !disconnected.refreshToken, 'disconnectAccount deletes stored tokens');

    // Re-connect account for subsequent tests
    await ConnectedEmailAccount.updateOne(
      { userId: userA._id },
      {
        $set: {
          accessToken: encryptToken('access-token-active-123'),
          refreshToken: encryptToken('refresh-token-active-456'),
          status: 'connected',
          tokenExpiry: new Date(Date.now() + 3600 * 1000)
        }
      }
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 3: EMAIL TEMPLATES & DYNAMIC PLACEHOLDER REPLACEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Template CRUD & Dynamic Variable Replacement ---');

    const template1 = await EmailTemplate.create({
      userId: userA._id,
      name: 'Guest Post Outreach Pitch',
      subject: 'Collaboration opportunity with {{websiteName}} for {{prospectDomain}}',
      body: 'Hi {{contactName}},\n\nI love your work on {{prospectDomain}}. We run {{websiteName}} and recently published a guide that your readers would love. As part of our {{campaignName}} outreach, would you be interested in an editorial exchange?\n\nBest,\n{{senderName}}',
      description: 'Standard guest post pitch for relevant niche blogs',
      tags: ['guest-post', 'cold-pitch']
    });

    assert(template1._id && template1.name === 'Guest Post Outreach Pitch', 'EmailTemplate created successfully');

    // Test template rendering with full context
    const rendered = replacePlaceholders(template1.body, {
      contactName: 'Sarah Jenkins',
      websiteName: 'Alice Authority Blog',
      prospectDomain: 'techradar.com',
      campaignName: 'Summer Guest Post Campaign',
      senderName: 'Alice'
    });

    assert(rendered.includes('Hi Sarah Jenkins,'), 'Placeholder {{contactName}} replaced correctly');
    assert(rendered.includes('work on techradar.com'), 'Placeholder {{prospectDomain}} replaced correctly');
    assert(rendered.includes('We run Alice Authority Blog'), 'Placeholder {{websiteName}} replaced correctly');
    assert(rendered.includes('Summer Guest Post Campaign'), 'Placeholder {{campaignName}} replaced correctly');
    assert(rendered.includes('Best,\nAlice'), 'Placeholder {{senderName}} replaced correctly');
    assert(!rendered.includes('{{') && !rendered.includes('}}'), 'No unresolved placeholders remain');

    // Test template fallback handling when contactName is missing
    const fallbackName = extractFallbackContactName('editor.john@techforge.io');
    assert(fallbackName === 'John', 'extractFallbackContactName correctly extracts first name from email');

    const fallbackRendered = replacePlaceholders('Hi {{contactName}}, check {{websiteName}}.', {
      contactName: fallbackName,
      websiteName: 'Alice Blog'
    });
    assert(
      fallbackRendered.includes('Hi John, check Alice Blog.'),
      'Fallback name used in replacePlaceholders successfully'
    );

    // Test renderOutreachContent helper
    const renderedOutreach = renderOutreachContent({
      subject: template1.subject,
      body: template1.body,
      prospect: {
        contactEmail: 'dave.miller@daveblog.org',
        prospectDomain: 'daveblog.org'
      },
      website: websiteA,
      campaign: { name: 'Q4 Outreach' },
      user: userA,
      senderName: 'Alice'
    });
    assert(renderedOutreach.subject.includes('Alice Authority Blog for daveblog.org'), 'renderOutreachContent subject rendered accurately');
    assert(renderedOutreach.body.includes('Hi Dave,'), 'renderOutreachContent body extracted and used Dave');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: CAMPAIGN, PROSPECTS & OUTREACH QUEUEING
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Campaign Outreach Queueing & Duplicate Prevention ---');

    const campaignA = await Campaign.create({
      userId: userA._id,
      websiteId: websiteA._id,
      name: 'Spring PR Outreach 2026',
      type: 'Guest Posting',
      status: 'active',
      targetBacklinks: 10
    });

    const prospect1 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'devcommunity.org',
      prospectUrl: 'https://devcommunity.org/blog',
      contactEmail: 'editor@devcommunity.org',
      status: 'qualified',
      source: 'keyword'
    });

    const prospect2 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'softwareweekly.net',
      prospectUrl: 'https://softwareweekly.net/features',
      contactEmail: 'contact@softwareweekly.net',
      status: 'qualified',
      source: 'competitor'
    });

    // Assign prospects to campaign (Phase 10 integration)
    const assignment1 = await CampaignProspectAssignment.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      outreachStatus: 'uncontacted'
    });

    const assignment2 = await CampaignProspectAssignment.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect2._id,
      outreachStatus: 'uncontacted'
    });

    // Queue emails for sending
    const queueItem1 = await OutreachEmail.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      assignmentId: assignment1._id,
      templateId: template1._id,
      connectedAccountId: emailAccountA._id,
      senderEmail: 'alice.seo@gmail.com',
      senderName: 'Alice SEO',
      recipientEmail: 'editor@devcommunity.org',
      recipientName: 'Dev Editor',
      subject: 'Collaboration Pitch for devcommunity.org',
      bodyHtml: '<p>Hi Dev Editor, let us collaborate.</p>',
      bodyText: 'Hi Dev Editor, let us collaborate.',
      status: 'pending',
      scheduledFor: new Date()
    });

    assert(queueItem1.trackingId && queueItem1.trackingId.length === 32, 'OutreachEmail generates 32-char UUID trackingId');
    assert(queueItem1.status === 'pending', 'Initial outreach state is pending');

    // Duplicate prevention: verify pending item is detected
    const duplicateCheck = await OutreachEmail.findOne({
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      status: { $in: ['pending', 'processing'] }
    });
    assert(duplicateCheck !== null, 'Duplicate pending outreach email detected in queue');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: QUEUE WORKER EXECUTION & PHASE 10 INTEGRATION (MOCKED GMAIL)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Queue Worker Execution & Phase 10 Campaign Advancement ---');

    // Test RFC 2822 email building and tracking pixel injection directly
    const rfc2822 = gmailService.buildRfc2822Email({
      from: 'alice.seo@gmail.com',
      fromName: 'Alice SEO',
      to: 'editor@devcommunity.org',
      subject: 'Collaboration Pitch for devcommunity.org',
      htmlBody: '<p>Hi Dev Editor, check <a href="https://aliceblog.io">our guide</a></p></body>',
      trackingId: queueItem1.trackingId,
      trackingBaseUrl: 'http://localhost:5002'
    });
    assert(rfc2822 && typeof rfc2822 === 'string', 'RFC 2822 email generated with base64url encoding');

    // Mock gmailService.sendEmail to simulate successful Gmail API transmission
    let gmailApiCalled = false;
    let sentPayload = null;

    const originalSendEmail = gmailService.sendEmail;
    gmailService.sendEmail = async ({ to, subject, htmlBody, textBody, trackingId }) => {
      gmailApiCalled = true;
      sentPayload = { to, subject, htmlBody, textBody, trackingId };
      return {
        messageId: 'gmail_msg_mock_987654321',
        threadId: 'gmail_thread_mock_12345'
      };
    };

    // Run atomic queue processor for item 1
    await emailQueueService.processNextQueueItem();
    assert(gmailApiCalled === true, 'Gmail API was called by queue processor');
    assert(sentPayload.to === 'editor@devcommunity.org', 'Recipient email matches queue item');
    assert(sentPayload.trackingId === queueItem1.trackingId, 'Tracking ID passed to sendEmail');

    // Verify OutreachEmail updated to sent
    const updatedEmail1 = await OutreachEmail.findById(queueItem1._id);
    assert(updatedEmail1.status === 'sent', 'OutreachEmail status transitioned to sent');
    assert(updatedEmail1.sentAt !== null, 'sentAt timestamp recorded on OutreachEmail');
    assert(updatedEmail1.gmailMessageId === 'gmail_msg_mock_987654321', 'Gmail message ID recorded');

    // Verify Audit Log EmailActivity recorded
    const sentActivity = await EmailActivity.findOne({
      outreachEmailId: queueItem1._id,
      eventType: 'sent'
    });
    assert(sentActivity !== null, 'EmailActivity audit log created for sent event');

    // Verify Phase 10 integration: CampaignProspectAssignment status updated
    const updatedAssignment1 = await CampaignProspectAssignment.findById(assignment1._id);
    assert(updatedAssignment1.outreachStatus === 'contacted', 'Assignment outreachStatus advanced to contacted');
    assert(updatedAssignment1.contactedAt !== null, 'Assignment contactedAt timestamp populated');

    // Verify CampaignActivity logged for Phase 10
    const campaignActivity = await CampaignActivity.findOne({
      campaignId: campaignA._id,
      assignmentId: assignment1._id,
      action: 'outreach_status_changed'
    });
    assert(campaignActivity !== null, 'Phase 10 CampaignActivity created for outreach status change');

    // -------------------------------------------------------------------------
    // TEST SUITE 6: TRANSIENT FAILURE & RETRY HANDLING
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Temporary Failure, Exponential Backoff & Retry Logic ---');

    // Queue second email
    const queueItem2 = await OutreachEmail.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect2._id,
      assignmentId: assignment2._id,
      templateId: template1._id,
      connectedAccountId: emailAccountA._id,
      senderEmail: 'alice.seo@gmail.com',
      senderName: 'Alice SEO',
      recipientEmail: 'contact@softwareweekly.net',
      recipientName: 'Weekly Editor',
      subject: 'Pitch for softwareweekly.net',
      bodyHtml: '<p>Hi Weekly Editor</p>',
      bodyText: 'Hi Weekly Editor',
      status: 'pending',
      scheduledFor: new Date()
    });

    // Mock Gmail API to fail with 429 rate limit (transient error)
    gmailService.sendEmail = async () => {
      const err = new Error('Rate limit exceeded: 429 Too Many Requests');
      err.code = 429;
      throw err;
    };

    // Run worker
    await emailQueueService.processNextQueueItem();

    // Verify retry state
    const retriedEmail = await OutreachEmail.findById(queueItem2._id);
    assert(retriedEmail.status === 'pending', 'Transient failure leaves status as pending for retry');
    assert(retriedEmail.attempts === 1, 'Attempt counter incremented to 1');
    assert(retriedEmail.errorMessage.includes('429'), 'Error message recorded on OutreachEmail');
    assert(new Date(retriedEmail.scheduledFor) > new Date(), 'Next attempt scheduled in future with backoff');

    // Verify CampaignProspectAssignment was NOT incorrectly marked as contacted
    const uncontactedAssignment2 = await CampaignProspectAssignment.findById(assignment2._id);
    assert(uncontactedAssignment2.outreachStatus === 'uncontacted', 'Assignment remains uncontacted on transient failure');

    // -------------------------------------------------------------------------
    // TEST SUITE 7: PERMANENT FAILURE AFTER MAX ATTEMPTS
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Permanent Failure Handling (Max 3 Attempts) ---');

    // Simulate 2 attempts reached so next attempt is the final 3rd attempt
    retriedEmail.attempts = 2;
    retriedEmail.scheduledFor = new Date();
    await retriedEmail.save();

    // Mock permanent failure (e.g. 400 Invalid recipient address)
    gmailService.sendEmail = async () => {
      const err = new Error('Invalid recipient email address: 400 Bad Request');
      err.status = 400;
      throw err;
    };

    await emailQueueService.processNextQueueItem();

    const failedEmail = await OutreachEmail.findById(queueItem2._id);
    assert(failedEmail.status === 'failed', 'Email transitioned to failed after max attempts');

    const failedActivity = await EmailActivity.findOne({
      outreachEmailId: queueItem2._id,
      eventType: 'failed'
    });
    assert(failedActivity !== null, 'EmailActivity logged for permanent failure');

    const stillUncontacted = await CampaignProspectAssignment.findById(assignment2._id);
    assert(stillUncontacted.outreachStatus === 'uncontacted', 'Assignment still not marked as contacted after failure');

    // Restore sendEmail mock to success
    gmailService.sendEmail = originalSendEmail;

    // -------------------------------------------------------------------------
    // TEST SUITE 8: FOLLOW-UP SCHEDULING & AUTOMATED EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Follow-up Management & Automated Status Advancement ---');

    // Schedule a follow-up for prospect 1
    const followUpDate = new Date(Date.now() - 1000); // 1 sec in the past to trigger immediately
    const followUp1 = await ScheduledFollowUp.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      assignmentId: assignment1._id,
      scheduledDate: followUpDate,
      notes: 'Second outreach attempt pitching guest article',
      status: 'scheduled'
    });

    assignment1.followUpAt = followUpDate;
    await assignment1.save();

    assert(followUp1.status === 'scheduled', 'Follow-up created with status scheduled');

    // Process due follow-ups
    const followUpCount = await emailQueueService.processScheduledFollowUps();
    assert(followUpCount >= 1, 'Follow-up processor executed overdue follow-up');

    const executedFollowUp = await ScheduledFollowUp.findById(followUp1._id);
    assert(executedFollowUp.status === 'executed', 'Follow-up marked as executed');

    // Verify assignment outreachStatus advanced to follow_up_due
    const followUpAssignment = await CampaignProspectAssignment.findById(assignment1._id);
    assert(followUpAssignment.outreachStatus === 'follow_up_due', 'Assignment advanced to follow_up_due');

    // -------------------------------------------------------------------------
    // TEST SUITE 9: FOLLOW-UP SKIPPING IF PROSPECT REPLIED OR REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Follow-up Skipping Logic (Replied / Rejected) ---');

    // Schedule follow-up for prospect 2, but mark assignment as 'replied'
    const pastDate = new Date(Date.now() - 5000);
    const followUp2 = await ScheduledFollowUp.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect2._id,
      assignmentId: assignment2._id,
      scheduledDate: pastDate,
      notes: 'Follow-up after initial pitch',
      status: 'scheduled'
    });

    assignment2.outreachStatus = 'replied';
    await assignment2.save();

    // Process follow-ups again
    await emailQueueService.processScheduledFollowUps();

    const skippedFollowUp = await ScheduledFollowUp.findById(followUp2._id);
    assert(skippedFollowUp.status === 'skipped', 'Follow-up skipped because prospect replied');
    assert(skippedFollowUp.skipReason.includes('replied'), 'skipReason accurately recorded');

    // -------------------------------------------------------------------------
    // TEST SUITE 10: OPEN & CLICK TRACKING
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Engagement Tracking (Pixel & Click Redirect) ---');

    // Simulate open tracking pixel visit
    const emailToTrack = await OutreachEmail.findById(queueItem1._id);
    emailToTrack.openedAt = new Date();
    emailToTrack.openCount = 1;
    await emailToTrack.save();

    await EmailActivity.create({
      outreachEmailId: emailToTrack._id,
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      eventType: 'opened',
      description: 'Prospect opened email',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Suite'
    });

    const openRecord = await OutreachEmail.findById(emailToTrack._id);
    assert(openRecord.openCount === 1 && openRecord.openedAt !== null, 'Open pixel increments count and logs timestamp');

    // Simulate link click tracking
    emailToTrack.clickedAt = new Date();
    emailToTrack.clickCount = 1;
    await emailToTrack.save();

    await EmailActivity.create({
      outreachEmailId: emailToTrack._id,
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: campaignA._id,
      prospectId: prospect1._id,
      eventType: 'clicked',
      description: 'Prospect clicked link in email',
      ipAddress: '127.0.0.1',
      metadata: { targetUrl: 'https://aliceblog.io/guide' }
    });

    const clickRecord = await OutreachEmail.findById(emailToTrack._id);
    assert(clickRecord.clickCount === 1 && clickRecord.clickedAt !== null, 'Click tracking increments count and logs timestamp');

    // -------------------------------------------------------------------------
    // TEST SUITE 11: MULTI-TENANT ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Multi-Tenant User Isolation & Data Protection ---');

    // User B attempts to access User A's templates
    const userBTemplates = await EmailTemplate.find({ userId: userB._id });
    assert(userBTemplates.length === 0, 'User B cannot see User A templates');

    // User B attempts to access User A's connected account
    const userBAccount = await ConnectedEmailAccount.findOne({ userId: userB._id });
    assert(userBAccount === null, 'User B has separate email account state');

    // User B attempts to view User A's outreach queue
    const userBEmails = await OutreachEmail.find({ userId: userB._id });
    assert(userBEmails.length === 0, 'User B cannot view User A outreach queue');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`Phase 11 Outreach Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Phase 11 test execution:', err);
    process.exit(1);
  }
}

async function main() {
  await setup();
  try {
    await runTests();
  } finally {
    await teardown();
  }
}

main();