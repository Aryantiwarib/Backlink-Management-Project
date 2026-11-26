import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringScan from '../models/MonitoringScan.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import Prospect from '../models/Prospect.js';
import OutreachEmail from '../models/OutreachEmail.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import AssistantConversation from '../models/AssistantConversation.js';

import {
  ASSISTANT_TOOL_DEFINITIONS,
  executeAssistantTool
} from '../services/assistantTools.js';
import { assistantService } from '../services/assistantService.js';
import { generateAssistantResponse } from '../services/openaiService.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 12: AI SEO Assistant Test Suite      ');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  let passed = 0;
  let failed = 0;

  function test(condition, name) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.error(`  FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Seed Users & Websites
    console.log('--- 1. Seeding Multi-Tenant Test Data ---');
    const userA = await User.create({
      name: 'Alice SEO',
      email: 'alice@linkora.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Bob Competitor',
      email: 'bob@linkora.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'Tech Growth Co',
      domain: 'techgrowth.io',
      url: 'https://techgrowth.io',
      verificationStatus: 'verified',
      verificationToken: 'token-a-123',
      isActive: true
    });

    const websiteB = await Website.create({
      userId: userB._id,
      name: 'Finance Insights',
      domain: 'financeinsights.com',
      url: 'https://financeinsights.com',
      verificationStatus: 'verified',
      verificationToken: 'token-b-123',
      isActive: true
    });

    // Seed SEO Snapshot for websiteA
    await SeoSnapshot.create({
      userId: userA._id,
      websiteId: websiteA._id,
      domain: websiteA.domain,
      domainAuthority: 45,
      pageAuthority: 38,
      rootDomainsToRootDomain: 120,
      externalPagesToRootDomain: 850,
      spamScore: 2
    });

    // Seed Backlinks for websiteA
    await Backlink.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://techradar.com/best-saas-tools',
        sourceDomain: 'techradar.com',
        targetUrl: 'https://techgrowth.io/platform',
        anchorText: 'best growth software',
        linkType: 'dofollow',
        sourceDomainAuthority: 82,
        sourcePageAuthority: 55
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://venturebeat.com/ai-seo-trends',
        sourceDomain: 'venturebeat.com',
        targetUrl: 'https://techgrowth.io/ai',
        anchorText: 'techgrowth ai platform',
        linkType: 'dofollow',
        sourceDomainAuthority: 78,
        sourcePageAuthority: 48
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        sourceUrl: 'https://medium.com/@dev/top-tools',
        sourceDomain: 'medium.com',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'linkora website',
        linkType: 'nofollow',
        sourceDomainAuthority: 90,
        sourcePageAuthority: 60
      }
    ]);

    // Seed Monitoring Events (lost and new)
    await MonitoringEvent.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'lost_backlink',
        sourceUrl: 'https://forbes.com/sites/tech/growth-tools',
        sourceDomain: 'forbes.com',
        targetUrl: 'https://techgrowth.io/enterprise',
        anchorText: 'leading enterprise tool'
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        eventType: 'new_backlink',
        sourceUrl: 'https://producthunt.com/posts/techgrowth',
        sourceDomain: 'producthunt.com',
        targetUrl: 'https://techgrowth.io',
        anchorText: 'TechGrowth Launch'
      }
    ]);

    // Seed Campaign for websiteA
    const camp1 = await Campaign.create({
      userId: userA._id,
      websiteId: websiteA._id,
      name: 'High Authority Tech Outreach',
      objective: 'Acquire 15 guest post mentions on tech publications',
      campaignType: 'Guest Posting',
      status: 'active',
      targetBacklinks: 15,
      metrics: {
        totalAssigned: 12,
        acquiredCount: 3,
        progressPercentage: 20
      }
    });

    // Seed Prospects
    const p1 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'techradar.com',
      prospectUrl: 'https://techradar.com/write-for-us',
      domainAuthority: 82,
      pageAuthority: 55,
      opportunityScore: 88,
      qualificationStatus: 'qualified',
      contactEmail: 'editor@techradar.com',
      contactStatus: 'found',
      source: 'competitor'
    });

    const p2 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA._id,
      prospectDomain: 'smashingmagazine.com',
      prospectUrl: 'https://smashingmagazine.com/contribute',
      domainAuthority: 75,
      pageAuthority: 62,
      opportunityScore: 78,
      qualificationStatus: 'qualified',
      contactEmail: 'pitches@smashingmagazine.com',
      contactStatus: 'found',
      source: 'keyword'
    });

    // Assign p1 to camp1
    await CampaignProspectAssignment.create([
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: p1._id,
        outreachStatus: 'contacted',
        notes: 'Initial outreach sent on Monday'
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: new mongoose.Types.ObjectId(),
        outreachStatus: 'link_acquired'
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: new mongoose.Types.ObjectId(),
        outreachStatus: 'link_acquired'
      },
      {
        userId: userA._id,
        websiteId: websiteA._id,
        campaignId: camp1._id,
        prospectId: new mongoose.Types.ObjectId(),
        outreachStatus: 'link_acquired'
      }
    ]);

    // Seed Outreach Email
    const connAcc = await ConnectedEmailAccount.create({
      userId: userA._id,
      email: 'outreach@techgrowth.io',
      status: 'connected',
      provider: 'gmail'
    });

    await OutreachEmail.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: camp1._id,
      prospectId: p1._id,
      connectedAccountId: connAcc._id,
      recipientEmail: 'editor@techradar.com',
      senderEmail: 'outreach@techgrowth.io',
      subject: 'Guest contribution on AI Backlink Workflows',
      body: 'Hi editor...',
      bodyHtml: '<p>Hi editor...</p>',
      status: 'sent'
    });

    await ScheduledFollowUp.create({
      userId: userA._id,
      websiteId: websiteA._id,
      campaignId: camp1._id,
      prospectId: p1._id,
      assignmentId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(Date.now() + 86400000),
      status: 'scheduled'
    });

    test(true, 'Multi-tenant test database seeded successfully');

    // 2. Test Tool Definitions Schema
    console.log('\n--- 2. OpenAI Tool Definitions Schema ---');
    test(Array.isArray(ASSISTANT_TOOL_DEFINITIONS), 'ASSISTANT_TOOL_DEFINITIONS is an array');
    test(ASSISTANT_TOOL_DEFINITIONS.length === 10, `Expected 10 tools, found ${ASSISTANT_TOOL_DEFINITIONS.length}`);

    const expectedToolNames = [
      'getWebsiteOverview',
      'getBacklinkSummary',
      'getNewBacklinks',
      'getLostBacklinks',
      'getCampaignSummary',
      'getCampaignDetails',
      'getTopProspects',
      'getProspectDetails',
      'getOutreachSummary',
      'getSeoRecommendations'
    ];

    const actualToolNames = ASSISTANT_TOOL_DEFINITIONS.map((t) => t.function.name);
    for (const name of expectedToolNames) {
      test(actualToolNames.includes(name), `Tool definition registered: ${name}`);
    }

    // 3. Test Individual Tool Execution
    console.log('\n--- 3. Tool Execution & Fact Retrieval ---');

    // Tool: getWebsiteOverview
    const siteOverview = await executeAssistantTool({
      name: 'getWebsiteOverview',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(siteOverview.success === true, 'getWebsiteOverview returns success');
    test(siteOverview.website.domain === 'techgrowth.io', 'getWebsiteOverview returns correct domain');
    test(siteOverview.seoMetrics.domainAuthority === 45, 'getWebsiteOverview returns domain authority 45');
    test(siteOverview.databaseSummary.savedBacklinks === 3, 'getWebsiteOverview returns savedBacklinks count (3)');

    // Tool: getBacklinkSummary
    const backlinkSumm = await executeAssistantTool({
      name: 'getBacklinkSummary',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(backlinkSumm.success === true, 'getBacklinkSummary returns success');
    test(backlinkSumm.totalBacklinks === 3, 'getBacklinkSummary counts 3 backlinks');
    test(backlinkSumm.referringDomains === 3, 'getBacklinkSummary counts 3 referring domains');
    test(backlinkSumm.dofollowCount === 2, 'getBacklinkSummary counts 2 dofollow backlinks');
    test(backlinkSumm.dofollowPercentage === 67, 'getBacklinkSummary calculates dofollowPercentage (67%)');
    test(backlinkSumm.averageDomainAuthority > 0, 'getBacklinkSummary calculates average DA');

    // Tool: getNewBacklinks
    const newLinks = await executeAssistantTool({
      name: 'getNewBacklinks',
      args: { websiteId: websiteA._id.toString(), limit: 5 },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(newLinks.success === true, 'getNewBacklinks returns success');
    test(newLinks.newBacklinks.length > 0, `getNewBacklinks retrieved ${newLinks.newBacklinks.length} new link(s)`);

    // Tool: getLostBacklinks
    const lostLinks = await executeAssistantTool({
      name: 'getLostBacklinks',
      args: { websiteId: websiteA._id.toString(), limit: 5 },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(lostLinks.success === true, 'getLostBacklinks returns success');
    test(lostLinks.lostBacklinksDetected === 1, 'getLostBacklinks correctly detected 1 lost backlink from Forbes');
    test(lostLinks.lostBacklinks[0].sourceDomain === 'forbes.com', 'getLostBacklinks identified forbes.com');

    // Tool: getCampaignSummary
    const campSummary = await executeAssistantTool({
      name: 'getCampaignSummary',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(campSummary.success === true, 'getCampaignSummary returns success');
    test(campSummary.overview.active === 1, 'getCampaignSummary reports 1 active campaign');
    test(campSummary.campaigns[0].name === 'High Authority Tech Outreach', 'getCampaignSummary returns campaign name');

    // Tool: getCampaignDetails
    const campDetails = await executeAssistantTool({
      name: 'getCampaignDetails',
      args: { campaignId: camp1._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(campDetails.success === true, 'getCampaignDetails returns success by ID');
    test(campDetails.campaign.progressPercentage === 20, 'getCampaignDetails reports 20% progress');
    test(campDetails.campaign.statusBreakdown.contacted === 1, 'getCampaignDetails reports 1 contacted prospect');

    // Tool: getTopProspects
    const topProspects = await executeAssistantTool({
      name: 'getTopProspects',
      args: { websiteId: websiteA._id.toString(), minScore: 50 },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(topProspects.success === true, 'getTopProspects returns success');
    test(topProspects.returnedCount === 2, 'getTopProspects returns 2 prospects with score >= 50');
    test(topProspects.prospects[0].opportunityScore >= topProspects.prospects[1].opportunityScore, 'getTopProspects correctly sorts by score descending');

    // Tool: getProspectDetails
    const pDetails = await executeAssistantTool({
      name: 'getProspectDetails',
      args: { domain: 'techradar.com' },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(pDetails.success === true, 'getProspectDetails returns success for techradar.com');
    test(pDetails.prospect.contactEmail === 'editor@techradar.com', 'getProspectDetails retrieves verified contact email');
    test(pDetails.prospect.assignedCampaigns.length === 1, 'getProspectDetails shows campaign assignment');

    // Tool: getOutreachSummary
    const outreachSumm = await executeAssistantTool({
      name: 'getOutreachSummary',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(outreachSumm.success === true, 'getOutreachSummary returns success');
    test(outreachSumm.gmailConnection.isConnected === true, 'getOutreachSummary shows Gmail connected');
    test(outreachSumm.outreachQueue.sent === 1, 'getOutreachSummary reports 1 email sent');
    test(outreachSumm.outreachQueue.scheduledFollowUps === 1, 'getOutreachSummary reports 1 scheduled follow-up');

    // Tool: getSeoRecommendations
    const seoRecs = await executeAssistantTool({
      name: 'getSeoRecommendations',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userA._id, websiteId: websiteA._id.toString() }
    });
    test(seoRecs.success === true, 'getSeoRecommendations returns success');
    test(Array.isArray(seoRecs.recommendations), 'getSeoRecommendations returns recommendations array');
    test(seoRecs.recommendations.some((r) => r.area === 'Backlink Retention'), 'getSeoRecommendations recommended lost backlink reclaim');

    // 4. Test Cross-Tenant Security & Isolation
    console.log('\n--- 4. Cross-Tenant Security & Tool Isolation ---');

    // User B tries to query websiteA data
    const userBQueryA = await executeAssistantTool({
      name: 'getWebsiteOverview',
      args: { websiteId: websiteA._id.toString() },
      context: { userId: userB._id, websiteId: websiteB._id.toString() }
    });
    test(userBQueryA.website.domain === 'financeinsights.com', 'Tool resolved to User B domain, refusing access to User A website');

    // User B tries to get details for User A campaign
    const userBCampDetails = await executeAssistantTool({
      name: 'getCampaignDetails',
      args: { campaignId: camp1._id.toString() },
      context: { userId: userB._id, websiteId: websiteB._id.toString() }
    });
    test(userBCampDetails.success === false, 'User B cannot query User A campaign details (Access denied)');

    // 5. Test Assistant Service & Conversation Lifecycle
    console.log('\n--- 5. Assistant Service & Conversation History ---');

    // Create conversation
    const newConv = await assistantService.createConversation({
      userId: userA._id,
      websiteId: websiteA._id,
      title: 'Backlink Audit Session'
    });
    test(Boolean(newConv.id), 'Conversation created successfully with ID');
    test(newConv.title === 'Backlink Audit Session', 'Conversation title stored accurately');

    // List conversations
    const convList = await assistantService.listConversations({ userId: userA._id });
    test(convList.length === 1, 'listConversations returns 1 conversation');
    test(convList[0].id === newConv.id, 'listConversations returns correct conversation ID');

    // Send mock message through assistantService
    const mockHandler = async ({ messages, context }) => {
      // Simulate assistant checking backlink summary
      const toolRes = await executeAssistantTool({
        name: 'getBacklinkSummary',
        args: { websiteId: context.websiteId },
        context
      });

      return {
        content: `You currently have **${toolRes.totalBacklinks} backlinks** across **${toolRes.referringDomains} referring domains**. Your dofollow ratio is **${toolRes.dofollowPercentage}%**.`,
        toolCalls: [
          {
            id: 'call_mock_123',
            name: 'getBacklinkSummary',
            args: { websiteId: context.websiteId },
            result: toolRes
          }
        ],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 150, completion_tokens: 45, total_tokens: 195 }
      };
    };

    // Test generateAssistantResponse with mock
    const aiResp = await generateAssistantResponse({
      messages: [{ role: 'user', content: 'How many backlinks do I have?' }],
      context: {
        userId: userA._id,
        websiteId: websiteA._id.toString(),
        websiteDomain: websiteA.domain
      },
      mockHandler
    });

    test(aiResp.content.includes('3 backlinks'), 'Mock AI response synthesized real tool backlink count (3)');
    test(aiResp.toolCalls.length === 1, 'Mock AI response recorded 1 tool call');

    // Cross-tenant conversation check
    await assert.rejects(
      async () => {
        await assistantService.getConversationById({
          userId: userB._id,
          conversationId: newConv.id
        });
      },
      (err) => {
        test(err.message.includes('not found') || err.message.includes('access denied'), 'User B is blocked from reading User A conversation');
        return true;
      }
    );

    // Delete conversation
    const deleteRes = await assistantService.deleteConversation({
      userId: userA._id,
      conversationId: newConv.id
    });
    test(deleteRes.success === true, 'deleteConversation succeeded');

    const convListAfterDelete = await assistantService.listConversations({ userId: userA._id });
    test(convListAfterDelete.length === 0, 'Conversation removed completely from MongoDB');

    // 6. Test Unconfigured API Key Behavior
    console.log('\n--- 6. Graceful Handling Without API Key ---');
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const unconfiguredResp = await generateAssistantResponse({
      messages: [{ role: 'user', content: 'Hello' }],
      context: { userId: userA._id, websiteDomain: websiteA.domain }
    });

    test(unconfiguredResp.content.includes('OpenAI API Key Not Configured'), 'Returns clear instructions when OPENAI_API_KEY is not set');

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }

    console.log(`\n======================================================`);
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    await mongoose.disconnect();
    await mongod.stop();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test suite execution error:', err);
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(1);
  }
}

runTests();
