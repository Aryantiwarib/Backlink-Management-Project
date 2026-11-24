import express from 'express';
import {
  getDiscoveryStatus,
  discoverCompetitors,
  discoverKeywords,
  enrichDomain,
  saveProspect,
  bulkSaveProspects,
  getSavedProspects,
  getStats,
  getProspectById,
  updateProspect,
  deleteProspect,
  bulkUpdateStatus,
  bulkDelete,
  exportCsv
} from '../controllers/prospectController.js';

const router = express.Router();

// Discovery provider status
router.get('/discovery/status', getDiscoveryStatus);

// Discovery operations
router.post('/:websiteId/discover/competitor', discoverCompetitors);
router.post('/:websiteId/discover/keyword', discoverKeywords);
router.post('/:websiteId/enrich', enrichDomain);

// Stats & CSV Export
router.get('/:websiteId/stats', getStats);
router.get('/:websiteId/export/csv', exportCsv);

// Bulk operations
router.post('/:websiteId/bulk-save', bulkSaveProspects);
router.post('/:websiteId/bulk-update', bulkUpdateStatus);
router.post('/:websiteId/bulk-delete', bulkDelete);

// Prospect collection CRUD
router.get('/:websiteId', getSavedProspects);
router.post('/:websiteId', saveProspect);
router.get('/:websiteId/:prospectId', getProspectById);
router.patch('/:websiteId/:prospectId', updateProspect);
router.delete('/:websiteId/:prospectId', deleteProspect);

export default router;
