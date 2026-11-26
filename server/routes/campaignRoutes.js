import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignStats,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  assignProspects,
  getCampaignProspects,
  updateAssignment,
  removeAssignment,
  bulkUpdateAssignmentsStatus,
  getCampaignActivities,
  updateProspectContact,
  runDiscovery,
  runContactDiscovery
} from '../controllers/campaignController.js';

const router = express.Router();

// Stats
router.get('/:websiteId/stats', getCampaignStats);

// Campaign Collection CRUD
router.get('/:websiteId', getCampaigns);
router.post('/:websiteId', createCampaign);
router.get('/:websiteId/:campaignId', getCampaignById);
router.patch('/:websiteId/:campaignId', updateCampaign);
router.patch('/:websiteId/:campaignId/status', updateCampaignStatus);
router.delete('/:websiteId/:campaignId', deleteCampaign);

// Automated Discovery & Contact Pipeline Triggers
router.post('/:websiteId/:campaignId/discover', runDiscovery);
router.post('/:websiteId/:campaignId/contact-discovery', runContactDiscovery);

// Campaign Prospect Assignments & Contact Management
router.get('/:websiteId/:campaignId/prospects', getCampaignProspects);
router.post('/:websiteId/:campaignId/prospects', assignProspects);
router.post('/:websiteId/:campaignId/prospects/bulk-status', bulkUpdateAssignmentsStatus);
router.patch('/:websiteId/:campaignId/prospects/:assignmentId', updateAssignment);
router.patch('/:websiteId/:campaignId/prospects/:assignmentId/contact', updateProspectContact);
router.delete('/:websiteId/:campaignId/prospects/:assignmentId', removeAssignment);

// Campaign Activity Timeline
router.get('/:websiteId/:campaignId/activities', getCampaignActivities);

export default router;
