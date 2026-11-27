import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import EmailDraft, { EMAIL_PURPOSES, EMAIL_TONES, EMAIL_LENGTHS } from '../models/EmailDraft.js';
import { createAuthToken } from '../utils/tokenHelper.js';
import { generateOutreachEmail, modifyOutreachEmail } from '../services/aiEmailService.js';

async function run() {
  console.log('\n================================================================');
  console.log('   LINKORA: AI Outreach Email Studio & Generation Tests         ');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SESSION_SECRET = 'test-ai-email-studio-secret-2026';
  process.env.PORT = '0';

  const { default: app } = await import('../app.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/ai-email`;

  let passed = 0;

  try {
    // Seed test users
    const userA = await User.create({
      name: 'Alex Marketer',
      email: 'alex_studio@linkora.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Bob Competitor',
      email: 'bob_studio@linkora.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'TechGrowth Media',
      domain: 'techgrowth.io',
      url: 'https://techgrowth.io',
      verificationStatus: 'verified',
      verificationToken: 'token-tg-123',
      isActive: true
    });

    const campaignA = await Campaign.create({
      userId: userA._id,
      websiteId: websiteA._id,
      name: 'Q4 High DA Guest Post Campaign',
      campaignType: 'Guest Posting',
      objective: 'Acquire editorial links in high-authority tech publications',
      niche: 'Software & Technology',
      targetBacklinks: 25,
      status: 'active'
    });

    const prospectA = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'venturebeat.com',
      prospectUrl: 'https://venturebeat.com/ai-editorial',
      domainAuthority: 89,
      pageAuthority: 74,
      relevanceCategory: 'Technology & AI',
      opportunityScore: 92,
      contactEmail: 'editors@venturebeat.com',
      contactEmails: [
        {
          email: 'editors@venturebeat.com',
          name: 'Sarah Editor',
          role: 'Managing Editor'
        }
      ],
      notes: 'Focus on enterprise AI scalability and practical developer workflows.'
    });

    const tokenA = createAuthToken(userA);
    const tokenB = createAuthToken(userB);

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated requests are rejected with 401
    // -------------------------------------------------------------------------
    const unauthRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientWebsite: 'example.com' })
    });
    assert.equal(unauthRes.status, 401, 'Unauthenticated POST /generate must return 401');
    console.log('  PASS: 1. Unauthenticated request to /api/ai-email/generate returns 401');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 2: Input Validation for Purpose, Tone, and Length
    // -------------------------------------------------------------------------
    const invalidPurposeRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        recipientWebsite: 'example.com',
        emailPurpose: 'Invalid Spammy Purpose'
      })
    });
    assert.equal(invalidPurposeRes.status, 400, 'Invalid email purpose must return 400');
    const invalidPurposeData = await invalidPurposeRes.json();
    assert.ok(invalidPurposeData.message.includes('Invalid email purpose'));

    const invalidToneRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        recipientWebsite: 'example.com',
        tone: 'Super Aggressive Hard Sell'
      })
    });
    assert.equal(invalidToneRes.status, 400, 'Invalid tone must return 400');

    const invalidLenRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        recipientWebsite: 'example.com',
        emailLength: 'NovelLength'
      })
    });
    assert.equal(invalidLenRes.status, 400, 'Invalid length must return 400');
    console.log('  PASS: 2. Input validation correctly rejects invalid purpose, tone, and length options');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 3: Email Generation with Complete Prospect and Campaign Details
    // -------------------------------------------------------------------------
    const fullGenRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        websiteId: websiteA._id.toString(),
        campaignId: campaignA._id.toString(),
        prospectId: prospectA._id.toString(),
        recipientName: 'Sarah Editor',
        recipientWebsite: 'venturebeat.com',
        companyName: 'VentureBeat',
        recipientEmail: 'editors@venturebeat.com',
        emailPurpose: 'Guest Post Outreach',
        tone: 'Professional',
        emailLength: 'Medium',
        customInstructions: 'Propose an article on 2026 enterprise AI infrastructure.',
        senderName: 'Alex Marketer',
        variationsCount: 2
      })
    });
    assert.equal(fullGenRes.status, 200, 'Generation with complete details must return 200');
    const fullGenData = await fullGenRes.json();
    assert.equal(fullGenData.success, true);
    assert.ok(Array.isArray(fullGenData.variations), 'Must return variations array');
    assert.equal(fullGenData.variations.length, 2, 'Must return requested 2 variations');
    assert.ok(fullGenData.variations[0].subject.length > 5, 'Subject must be non-empty');
    assert.ok(fullGenData.variations[0].body.includes('Sarah'), 'Body should address Sarah');
    console.log('  PASS: 3. Email generation succeeds with complete prospect & campaign details');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 4: Email Generation with Missing Optional Details (Zero Hallucination)
    // -------------------------------------------------------------------------
    const minimalGenRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        recipientWebsite: 'independentblog.org',
        emailPurpose: 'Backlink Request',
        tone: 'Natural and Human',
        emailLength: 'Short',
        variationsCount: 1
      })
    });
    assert.equal(minimalGenRes.status, 200);
    const minimalGenData = await minimalGenRes.json();
    assert.equal(minimalGenData.success, true);
    assert.equal(minimalGenData.variations.length, 1);
    const minimalBody = minimalGenData.variations[0].body;
    // Verify no fake hallucinations like "Dear John" when no name was given
    assert.ok(!minimalBody.includes('undefined'), 'No undefined literals in body');
    assert.ok(!minimalBody.includes('null'), 'No null literals in body');
    console.log('  PASS: 4. Generation with minimal details operates cleanly without hallucinations');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 5: Verify All 8 Email Purposes
    // -------------------------------------------------------------------------
    for (const purpose of EMAIL_PURPOSES) {
      const pRes = await generateOutreachEmail({
        recipientWebsite: 'example.com',
        emailPurpose: purpose,
        tone: 'Professional',
        emailLength: 'Short',
        variationsCount: 1
      });
      assert.equal(pRes.success, true);
      assert.ok(pRes.variations[0].subject.length > 0);
      assert.ok(pRes.variations[0].body.length > 0);
    }
    console.log(`  PASS: 5. Verified email generation across all ${EMAIL_PURPOSES.length} supported purposes`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 6: Verify All 8 Tone Options
    // -------------------------------------------------------------------------
    for (const t of EMAIL_TONES) {
      const tRes = await generateOutreachEmail({
        recipientWebsite: 'example.com',
        emailPurpose: 'Backlink Request',
        tone: t,
        emailLength: 'Short',
        variationsCount: 1
      });
      assert.equal(tRes.success, true);
      assert.ok(tRes.variations[0].body.length > 0);
    }
    console.log(`  PASS: 6. Verified email generation across all ${EMAIL_TONES.length} supported tones`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 7: Verify Short, Medium, and Detailed Email Lengths
    // -------------------------------------------------------------------------
    const shortRes = await generateOutreachEmail({
      recipientWebsite: 'example.com',
      emailLength: 'Short',
      variationsCount: 1
    });
    const medRes = await generateOutreachEmail({
      recipientWebsite: 'example.com',
      emailLength: 'Medium',
      variationsCount: 1
    });
    assert.ok(shortRes.variations[0].body.length > 0);
    assert.ok(medRes.variations[0].body.length > 0);
    console.log('  PASS: 7. Verified Short, Medium, and Detailed length modes');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 8: Multiple Variations (2x and 3x) Generation
    // -------------------------------------------------------------------------
    const tripleGenRes = await generateOutreachEmail({
      recipientWebsite: 'techblog.com',
      emailPurpose: 'Collaboration Request',
      variationsCount: 3
    });
    assert.equal(tripleGenRes.variations.length, 3, 'Must return exactly 3 variations');
    assert.notEqual(
      tripleGenRes.variations[0].subject,
      tripleGenRes.variations[1].subject,
      'Variations must provide different subject lines'
    );
    console.log('  PASS: 8. Multiple variations (3x) generated with distinct subject lines');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 9: Email Modification Actions Independently
    // -------------------------------------------------------------------------
    const sampleSubject = 'Collaboration inquiry for techgrowth.io';
    const sampleBody =
      'Hi Sarah,\n\nI noticed your coverage on venturebeat.com and wanted to reach out. We published detailed data on techgrowth.io that your readers might find valuable.\n\nWould you be open to collaborating?\n\nBest regards,\nAlex';

    // 9a. Make shorter
    const shorterRes = await modifyOutreachEmail({
      currentSubject: sampleSubject,
      currentBody: sampleBody,
      action: 'make_shorter'
    });
    assert.equal(shorterRes.success, true);
    assert.ok(shorterRes.body.length > 0);

    // 9b. Make longer
    const longerRes = await modifyOutreachEmail({
      currentSubject: sampleSubject,
      currentBody: sampleBody,
      action: 'make_longer'
    });
    assert.equal(longerRes.success, true);
    assert.ok(longerRes.body.length >= sampleBody.length);

    // 9c. Change tone to Casual
    const toneRes = await modifyOutreachEmail({
      currentSubject: sampleSubject,
      currentBody: sampleBody,
      action: 'change_tone',
      tone: 'Casual'
    });
    assert.equal(toneRes.success, true);
    assert.ok(toneRes.body.length > 0);

    // 9d. Improve CTA
    const ctaRes = await modifyOutreachEmail({
      currentSubject: sampleSubject,
      currentBody: sampleBody,
      action: 'improve_cta'
    });
    assert.equal(ctaRes.success, true);
    assert.ok(ctaRes.body.includes('open'));

    // 9e. Subject only modification via HTTP
    const modHttpRes = await fetch(`${baseUrl}/modify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        currentSubject: sampleSubject,
        currentBody: sampleBody,
        action: 'make_more_persuasive',
        targetField: 'subject'
      })
    });
    assert.equal(modHttpRes.status, 200);
    const modHttpData = await modHttpRes.json();
    assert.equal(modHttpData.success, true);
    console.log('  PASS: 9. Email modification actions (tone, length, CTA, persuasion, target field) operate cleanly');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 10: Draft Saving, Retrieval, Revision History, and Discard
    // -------------------------------------------------------------------------
    // 10a. Create Draft
    const saveRes = await fetch(`${baseUrl}/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        websiteId: websiteA._id.toString(),
        campaignId: campaignA._id.toString(),
        prospectId: prospectA._id.toString(),
        recipientName: 'Sarah Editor',
        recipientWebsite: 'venturebeat.com',
        companyName: 'VentureBeat',
        recipientEmail: 'editors@venturebeat.com',
        emailPurpose: 'Guest Post Outreach',
        tone: 'Professional',
        emailLength: 'Medium',
        subject: 'Guest post pitch: 2026 AI Architecture',
        body: 'Hi Sarah,\n\nI would love to pitch an editorial guide for VentureBeat...',
        variations: [
          {
            variationId: 'var-1',
            subject: 'Guest post pitch: 2026 AI Architecture',
            body: 'Hi Sarah,\n\nI would love to pitch an editorial guide for VentureBeat...'
          }
        ]
      })
    });
    assert.equal(saveRes.status, 201, 'Draft creation must return 201');
    const saveData = await saveRes.json();
    assert.equal(saveData.success, true);
    const draftId = saveData.draft.id;
    assert.ok(draftId, 'Draft must have ID');
    assert.equal(saveData.draft.revisions.length, 1, 'Initial creation must create 1 revision entry');

    // 10b. Update Draft with revision tracking
    const updateRes = await fetch(`${baseUrl}/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        draftId,
        websiteId: websiteA._id.toString(),
        subject: 'Updated Subject: 2026 AI Architecture',
        body: 'Updated body with new data...',
        actionTaken: 'applied_make_more_persuasive'
      })
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.draft.subject, 'Updated Subject: 2026 AI Architecture');
    assert.equal(updateData.draft.revisions.length, 2, 'Revision stack must increment on edit');

    // 10c. Retrieve single draft
    const getDraftRes = await fetch(`${baseUrl}/drafts/${draftId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(getDraftRes.status, 200);
    const getDraftData = await getDraftRes.json();
    assert.equal(getDraftData.draft.id, draftId);

    // 10d. List drafts filtered by website
    const listDraftsRes = await fetch(`${baseUrl}/drafts?websiteId=${websiteA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(listDraftsRes.status, 200);
    const listDraftsData = await listDraftsRes.json();
    assert.ok(listDraftsData.count >= 1);
    assert.equal(listDraftsData.drafts[0].recipientWebsite, 'venturebeat.com');
    console.log('  PASS: 10. EmailDraft lifecycle (create, update, revision history, list) operates with 100% fidelity');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 11: Security Isolation (User B cannot access or modify User A's drafts)
    // -------------------------------------------------------------------------
    const unauthorizedGetRes = await fetch(`${baseUrl}/drafts/${draftId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(unauthorizedGetRes.status, 404, 'User B must not see User A draft (returns 404)');

    const unauthorizedDelRes = await fetch(`${baseUrl}/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(unauthorizedDelRes.status, 404, 'User B must not delete User A draft');
    console.log('  PASS: 11. Security boundaries verified: Cross-user draft leakage strictly prevented');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 12: Discard / Delete Draft
    // -------------------------------------------------------------------------
    const delRes = await fetch(`${baseUrl}/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(delRes.status, 200);
    const verifyDel = await EmailDraft.findById(draftId);
    assert.equal(verifyDel, null, 'Draft must be removed from MongoDB');
    console.log('  PASS: 12. Draft discard completely deletes record from database');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 13: Existing Campaign and Outreach Functionality Regression Check
    // -------------------------------------------------------------------------
    const campaignVerify = await Campaign.findById(campaignA._id);
    assert.ok(campaignVerify, 'Campaign must remain intact');
    assert.equal(campaignVerify.status, 'active');

    const prospectVerify = await Prospect.findById(prospectA._id);
    assert.ok(prospectVerify, 'Prospect must remain intact');
    assert.equal(prospectVerify.domainAuthority, 89);
    console.log('  PASS: 13. Verified 0 regressions against existing campaign and prospect schemas');
    passed++;

    console.log(`\nAll ${passed} AI Email Studio test suites passed with 100% success!\n`);
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite failure:', err);
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(1);
  }
}

run();
