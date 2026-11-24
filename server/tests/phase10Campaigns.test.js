import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import CampaignActivity from '../models/CampaignActivity.js';
import { campaignService } from '../services/campaignService.js';

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
  console.log('   LINKORA Phase 10: Campaign Management Test Suite   ');
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
    // Seed Users & Websites
    const userA = await User.create({
      name: 'Campaign Master A',
      email: 'campaignA@linkora.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Campaign Master B',
      email: 'campaignB@linkora.io',
      password: 'password123'
    });

    const websiteA1 = await Website.create({
      userId: userA._id,
      name: 'Tech Blog A1',
      domain: 'techblog-a1.io',
      url: 'https://techblog-a1.io',
      verificationStatus: 'verified',
      verificationToken: 'tok-a1-123',
      isActive: true
    });

    const websiteA2 = await Website.create({
      userId: userA._id,
      name: 'Tech Store A2',
      domain: 'techstore-a2.io',
      url: 'https://techstore-a2.io',
      verificationStatus: 'verified',
      verificationToken: 'tok-a2-123',
      isActive: true
    });

    const websiteB = await Website.create({
      userId: userB._id,
      name: 'B Store',
      domain: 'b-store.org',
      url: 'https://b-store.org',
      verificationStatus: 'verified',
      verificationToken: 'tok-b-123',
      isActive: true
    });

    // Seed Phase 9 Prospects for Website A1
    const p1 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA1._id,
      prospectDomain: 'searchenginejournal.com',
      prospectUrl: 'https://searchenginejournal.com/best-seo-tools',
      title: 'Top SEO Tools',
      domainAuthority: 85,
      pageAuthority: 70,
      opportunityScore: 92,
      discoveryMethod: 'competitor',
      status: 'saved',
      contactEmail: 'editor@searchenginejournal.com'
    });

    const p2 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA1._id,
      prospectDomain: 'techcrunch.com',
      prospectUrl: 'https://techcrunch.com/startups',
      title: 'Startup Trends',
      domainAuthority: 93,
      pageAuthority: 78,
      opportunityScore: 96,
      discoveryMethod: 'serp',
      status: 'saved',
      contactEmail: 'tips@techcrunch.com'
    });

    const p3 = await Prospect.create({
      userId: userA._id,
      websiteId: websiteA1._id,
      prospectDomain: 'hackernoon.com',
      prospectUrl: 'https://hackernoon.com/tech-tips',
      title: 'Developer Guides',
      domainAuthority: 74,
      pageAuthority: 55,
      opportunityScore: 81,
      discoveryMethod: 'serp',
      status: 'saved'
    });

    // Seed a prospect for Website B
    const pB = await Prospect.create({
      userId: userB._id,
      websiteId: websiteB._id,
      prospectDomain: 'bloomberg.com',
      prospectUrl: 'https://bloomberg.com/business',
      title: 'Market Updates',
      domainAuthority: 94,
      opportunityScore: 95,
      discoveryMethod: 'serp',
      status: 'saved'
    });

    // -------------------------------------------------------------
    // Test 1: Campaign Creation with Validation
    // -------------------------------------------------------------
    console.log('\n--- 1. Campaign Creation with Validation ---');
    let camp1;
    try {
      camp1 = await campaignService.createCampaign({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignData: {
          name: 'Q4 High-DA Outreach',
          description: 'Outreach to top tier tech and SEO blogs',
          campaignType: 'Guest Posting',
          objective: 'Acquire 10 high-authority dofollow contextual backlinks',
          targetBacklinks: 10,
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-12-31'),
          status: 'active'
        }
      });
      assert(
        camp1 && camp1.name === 'Q4 High-DA Outreach' && camp1.targetBacklinks === 10,
        'Creates campaign successfully with valid fields'
      );
    } catch (err) {
      assert(false, `Campaign creation failed: ${err.message}`);
    }

    // Validation checks: Missing name
    let validationFailed = false;
    try {
      await campaignService.createCampaign({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignData: {
          name: '   ',
          targetBacklinks: 5
        }
      });
    } catch (err) {
      validationFailed = true;
    }
    assert(validationFailed, 'Rejects campaign with empty name');

    // Validation checks: Negative targetBacklinks
    let negativeTargetFailed = false;
    try {
      await campaignService.createCampaign({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignData: {
          name: 'Invalid Target',
          targetBacklinks: -5
        }
      });
    } catch (err) {
      negativeTargetFailed = true;
    }
    assert(negativeTargetFailed, 'Rejects campaign with negative target backlinks');

    // Validation checks: End date before start date
    let dateOrderFailed = false;
    try {
      await campaignService.createCampaign({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignData: {
          name: 'Invalid Dates',
          startDate: new Date('2026-12-31'),
          endDate: new Date('2026-01-01')
        }
      });
    } catch (err) {
      dateOrderFailed = true;
    }
    assert(dateOrderFailed, 'Rejects campaign when end date is earlier than start date');

    // -------------------------------------------------------------
    // Test 2: Campaign Listing, Filtering & Pagination
    // -------------------------------------------------------------
    console.log('\n--- 2. Campaign Listing, Filtering & Pagination ---');
    // Create additional campaigns
    const camp2 = await campaignService.createCampaign({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignData: {
        name: 'Competitor Intercept 2026',
        campaignType: 'Competitor Link Acquisition',
        targetBacklinks: 20,
        status: 'draft'
      }
    });

    const camp3 = await campaignService.createCampaign({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignData: {
        name: 'Resource Page Link Drive',
        campaignType: 'Resource Page Outreach',
        targetBacklinks: 15,
        status: 'paused'
      }
    });

    const listAll = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'all'
    });
    assert(
      listAll.campaigns.length === 3 && listAll.pagination.total === 3,
      'Lists all campaigns with correct count'
    );

    const listFiltered = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'draft'
    });
    assert(
      listFiltered.campaigns.length === 1 && listFiltered.campaigns[0].name === 'Competitor Intercept 2026',
      'Filters campaigns accurately by status'
    );

    const listSearch = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'all',
      search: 'High-DA'
    });
    assert(
      listSearch.campaigns.length === 1 && (listSearch.campaigns[0].id === camp1.id || listSearch.campaigns[0]._id?.toString() === camp1.id),
      'Searches campaigns by keyword match'
    );

    const listType = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'all',
      campaignType: 'Resource Page Outreach'
    });
    assert(
      listType.campaigns.length === 1 && listType.campaigns[0].campaignType === 'Resource Page Outreach',
      'Filters campaigns accurately by campaignType strategy'
    );

    // -------------------------------------------------------------
    // Test 3: Campaign Update
    // -------------------------------------------------------------
    console.log('\n--- 3. Campaign Update ---');
    const updatedCamp1 = await campaignService.updateCampaign({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      updateData: {
        name: 'Q4 High-DA Outreach - Expanded',
        targetBacklinks: 18,
        objective: 'Scale to 18 high-authority backlinks'
      }
    });
    assert(
      updatedCamp1.name === 'Q4 High-DA Outreach - Expanded' && updatedCamp1.targetBacklinks === 18,
      'Updates campaign name, objective, and targetBacklinks'
    );

    // -------------------------------------------------------------
    // Test 4: Campaign Status Transitions
    // -------------------------------------------------------------
    console.log('\n--- 4. Campaign Status Transitions ---');
    const pausedCamp1 = await campaignService.updateCampaignStatus({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      status: 'paused'
    });
    assert(pausedCamp1.status === 'paused', 'Transitions status from active to paused');

    const resumedCamp1 = await campaignService.updateCampaignStatus({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      status: 'active'
    });
    assert(resumedCamp1.status === 'active', 'Transitions status from paused to active');

    let invalidStatusFailed = false;
    try {
      await campaignService.updateCampaignStatus({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignId: camp1.id,
        status: 'invalid_status_xyz'
      });
    } catch (err) {
      invalidStatusFailed = true;
    }
    assert(invalidStatusFailed, 'Rejects invalid campaign status transition');

    // -------------------------------------------------------------
    // Test 5: Prospect Selection from Phase 9 Pipeline
    // -------------------------------------------------------------
    console.log('\n--- 5. Prospect Selection from Phase 9 Pipeline ---');
    const websiteA1Prospects = await Prospect.find({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'saved'
    });
    assert(
      websiteA1Prospects.length === 3,
      'Accurately loads 3 saved Phase 9 prospects available for assignment'
    );

    // -------------------------------------------------------------
    // Test 6: Bulk Prospect Assignment to Campaign
    // -------------------------------------------------------------
    console.log('\n--- 6. Bulk Prospect Assignment to Campaign ---');
    const assignRes = await campaignService.assignProspects({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      prospectIds: [p1._id, p2._id],
      notes: 'Initial high-priority prospect batch'
    });
    assert(
      assignRes.assignedCount === 2 && assignRes.assignments.length === 2,
      'Bulk assigns multiple prospects to campaign'
    );

    const camp1Prospects = await campaignService.getCampaignProspects({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id
    });
    assert(
      camp1Prospects.assignments.length === 2 &&
      camp1Prospects.assignments[0].outreachStatus === 'uncontacted',
      'Assigned prospects default to outreachStatus "uncontacted"'
    );

    // -------------------------------------------------------------
    // Test 7: Duplicate Assignment Prevention
    // -------------------------------------------------------------
    console.log('\n--- 7. Duplicate Assignment Prevention ---');
    const duplicateAssignRes = await campaignService.assignProspects({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      prospectIds: [p1._id, p3._id], // p1 is already assigned, p3 is new
      notes: 'Batch with one duplicate'
    });
    assert(
      duplicateAssignRes.assignedCount === 1 && duplicateAssignRes.duplicateCount === 1,
      'Correctly skips already-assigned prospects and only assigns new ones'
    );

    const totalAfterDups = await CampaignProspectAssignment.countDocuments({
      campaignId: camp1.id
    });
    assert(totalAfterDups === 3, 'Total assignments in camp1 is exactly 3 without duplicates');

    // -------------------------------------------------------------
    // Test 8: Same Prospect Assigned to Multiple Campaigns
    // -------------------------------------------------------------
    console.log('\n--- 8. Multi-Campaign Prospect Assignment ---');
    const camp2Assign = await campaignService.assignProspects({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp2.id,
      prospectIds: [p1._id], // Same p1 assigned to camp2 as well
      notes: 'Testing cross-campaign assignment'
    });
    assert(
      camp2Assign.assignedCount === 1,
      'Successfully assigns the same prospect to a second independent campaign'
    );

    const p1Assignments = await CampaignProspectAssignment.find({ prospectId: p1._id });
    assert(
      p1Assignments.length === 2,
      'Prospect p1 has 2 independent campaign assignments'
    );

    // -------------------------------------------------------------
    // Test 9: Campaign-Specific Status Updates
    // -------------------------------------------------------------
    console.log('\n--- 9. Campaign-Specific Status Updates ---');
    const camp1AssignmentP1 = await CampaignProspectAssignment.findOne({
      campaignId: camp1.id,
      prospectId: p1._id
    });

    const updatedAssignment = await campaignService.updateAssignment({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      assignmentId: camp1AssignmentP1._id,
      updateData: {
        outreachStatus: 'contacted',
        notes: 'Pitch email sent to editor',
        followUpAt: new Date(Date.now() + 86400000 * 3)
      }
    });
    assert(
      updatedAssignment.outreachStatus === 'contacted' &&
      updatedAssignment.contactedAt !== null &&
      updatedAssignment.notes === 'Pitch email sent to editor',
      'Updates outreachStatus to "contacted" with auto-set contactedAt timestamp'
    );

    // Transition to link_acquired
    const acquiredAssignment = await campaignService.updateAssignment({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      assignmentId: camp1AssignmentP1._id,
      updateData: {
        outreachStatus: 'link_acquired',
        notes: 'Backlink published live on SEJ'
      }
    });
    assert(
      acquiredAssignment.outreachStatus === 'link_acquired' &&
      acquiredAssignment.acquiredAt !== null,
      'Transitions outreachStatus to "link_acquired" and sets acquiredAt timestamp'
    );

    // -------------------------------------------------------------
    // Test 10: Global Phase 9 Prospect Status Remains Unchanged
    // -------------------------------------------------------------
    console.log('\n--- 10. Global Phase 9 Prospect Status Independence ---');
    const freshP1 = await Prospect.findById(p1._id);
    assert(
      freshP1.status === 'saved',
      'Global Phase 9 prospect status remains "saved" even though campaign assignment is "link_acquired"'
    );

    const camp2AssignmentP1 = await CampaignProspectAssignment.findOne({
      campaignId: camp2.id,
      prospectId: p1._id
    });
    assert(
      camp2AssignmentP1.outreachStatus === 'uncontacted',
      'Campaign 2 assignment remains "uncontacted" and completely unaffected'
    );

    // -------------------------------------------------------------
    // Test 11: Campaign Analytics Calculations
    // -------------------------------------------------------------
    console.log('\n--- 11. Campaign Analytics Calculations ---');
    const camp1Details = await campaignService.getCampaignById({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id
    });
    assert(
      camp1Details.metrics.totalAssigned === 3,
      'Analytics reports correct totalAssigned (3)'
    );
    assert(
      camp1Details.metrics.acquiredCount === 1,
      'Analytics reports correct acquiredCount (1)'
    );
    // target was 18, acquired is 1 -> round(1/18 * 100) = 6%
    assert(
      camp1Details.metrics.progressPercentage === 6,
      `Calculates accurate progress percentage (${camp1Details.metrics.progressPercentage}%)`
    );
    assert(
      camp1Details.metrics.statusBreakdown.link_acquired === 1 &&
      camp1Details.metrics.statusBreakdown.uncontacted === 2,
      'Calculates accurate status breakdown counts'
    );

    const highLevelStats = await campaignService.getCampaignStats({
      userId: userA._id,
      websiteId: websiteA1._id
    });
    assert(
      highLevelStats.totalCampaigns === 3 &&
      highLevelStats.totalAssignedProspects === 4 && // 3 in camp1 + 1 in camp2
      highLevelStats.totalAcquiredBacklinks === 1,
      'High-level dashboard stats aggregate across all website campaigns accurately'
    );

    // -------------------------------------------------------------
    // Test 12: Activity History Creation and Logging
    // -------------------------------------------------------------
    console.log('\n--- 12. Activity History Logging ---');
    const activities = await campaignService.getCampaignActivities({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id
    });
    assert(activities.length >= 3, `Logs campaign activities (found ${activities.length})`);
    const actionTypes = activities.map((a) => a.action);
    assert(
      actionTypes.includes('campaign_created') &&
      actionTypes.includes('prospects_assigned') &&
      actionTypes.includes('link_acquired'),
      'Activity history includes campaign_created, prospects_assigned, and link_acquired actions'
    );

    // -------------------------------------------------------------
    // Test 13: Campaign Archiving Filter Behavior
    // -------------------------------------------------------------
    console.log('\n--- 13. Campaign Archiving Filter Behavior ---');
    await campaignService.updateCampaignStatus({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp3.id,
      status: 'archived'
    });

    const defaultList = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'all'
    });
    const containsArchivedByDefault = defaultList.campaigns.some(
      (c) => (c.id || c._id)?.toString() === camp3.id.toString()
    );
    assert(
      !containsArchivedByDefault,
      'Archived campaigns are excluded by default when status="all"'
    );

    const archivedList = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA1._id,
      status: 'archived'
    });
    assert(
      archivedList.campaigns.length === 1 &&
      (archivedList.campaigns[0].id || archivedList.campaigns[0]._id)?.toString() === camp3.id.toString(),
      'Archived campaigns are retrieved when status="archived"'
    );

    // -------------------------------------------------------------
    // Test 14: Website Switching Isolation
    // -------------------------------------------------------------
    console.log('\n--- 14. Website Switching Isolation ---');
    const websiteA2Campaigns = await campaignService.getCampaigns({
      userId: userA._id,
      websiteId: websiteA2._id,
      status: 'all'
    });
    assert(
      websiteA2Campaigns.campaigns.length === 0,
      'Campaigns belonging to Website A1 are completely invisible in Website A2'
    );

    // -------------------------------------------------------------
    // Test 15: Cross-Tenant Security and User Ownership
    // -------------------------------------------------------------
    console.log('\n--- 15. Cross-Tenant Security & User Ownership ---');
    let userBCannotReadCamp1 = false;
    try {
      await campaignService.getCampaignById({
        userId: userB._id,
        websiteId: websiteA1._id,
        campaignId: camp1.id
      });
    } catch (err) {
      userBCannotReadCamp1 = true;
    }
    assert(userBCannotReadCamp1, 'User B cannot access User A campaign (404/Access Denied)');

    let userBCannotAssign = false;
    try {
      await campaignService.assignProspects({
        userId: userB._id,
        websiteId: websiteA1._id,
        campaignId: camp1.id,
        prospectIds: [pB._id]
      });
    } catch (err) {
      userBCannotAssign = true;
    }
    assert(userBCannotAssign, 'User B cannot assign prospects to User A campaign');

    let cannotAssignCrossWebsiteProspect = false;
    try {
      // User A attempting to assign User B's prospect to User A's campaign
      await campaignService.assignProspects({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignId: camp1.id,
        prospectIds: [pB._id]
      });
    } catch (err) {
      cannotAssignCrossWebsiteProspect = true;
    }
    assert(cannotAssignCrossWebsiteProspect, 'Cannot assign prospects belonging to another user or website');

    // -------------------------------------------------------------
    // Test 16: Invalid IDs Handled Gracefully
    // -------------------------------------------------------------
    console.log('\n--- 16. Invalid IDs Handled Gracefully ---');
    let fakeCampaignNotFound = false;
    try {
      const fakeId = new mongoose.Types.ObjectId();
      await campaignService.getCampaignById({
        userId: userA._id,
        websiteId: websiteA1._id,
        campaignId: fakeId
      });
    } catch (err) {
      fakeCampaignNotFound = err.status === 404 || err.statusCode === 404;
    }
    assert(fakeCampaignNotFound, 'Returns 404 for non-existent campaign ID');

    // -------------------------------------------------------------
    // Test 17: Assignment Removal without Deleting Phase 9 Prospect
    // -------------------------------------------------------------
    console.log('\n--- 17. Safe Assignment Removal ---');
    const camp1AssignmentP3 = await CampaignProspectAssignment.findOne({
      campaignId: camp1.id,
      prospectId: p3._id
    });

    const removeRes = await campaignService.removeAssignment({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp1.id,
      assignmentId: camp1AssignmentP3._id
    });
    assert(removeRes.deleted === true, 'Successfully removes prospect assignment from campaign');

    const checkP3AfterRemoval = await Prospect.findById(p3._id);
    assert(
      checkP3AfterRemoval !== null && checkP3AfterRemoval.status === 'saved',
      'Original Phase 9 prospect is fully preserved and NOT deleted'
    );

    // -------------------------------------------------------------
    // Test 18: Campaign Deletion with Cascade Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 18. Campaign Deletion with Cascade Cleanup ---');
    const deleteRes = await campaignService.deleteCampaign({
      userId: userA._id,
      websiteId: websiteA1._id,
      campaignId: camp2.id
    });
    assert(deleteRes.deleted === true, 'Deletes campaign successfully');

    const camp2AssignmentsRemaining = await CampaignProspectAssignment.countDocuments({
      campaignId: camp2.id
    });
    assert(
      camp2AssignmentsRemaining === 0,
      'Cascades deletion: all prospect assignments for deleted campaign are removed'
    );

    const camp2ActivitiesRemaining = await CampaignActivity.countDocuments({
      campaignId: camp2.id
    });
    assert(
      camp2ActivitiesRemaining === 0,
      'Cascades deletion: all activity history logs for deleted campaign are removed'
    );

    const checkP1StillAlive = await Prospect.findById(p1._id);
    assert(
      checkP1StillAlive !== null,
      'Phase 9 prospects assigned to deleted campaign remain intact in database'
    );

    // -------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    await setup();
    await runTests();
  } finally {
    await teardown();
  }
}

main();
