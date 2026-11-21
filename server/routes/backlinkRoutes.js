import express from 'express';
import {
  getSavedBacklinks,
  getBacklinkStats,
  getBacklinkAnalysis,
  getBacklinkById,
  createBacklink,
  deleteBacklink
} from '../controllers/backlinkController.js';

const router = express.Router();

router.get('/', getSavedBacklinks);
router.get('/stats', getBacklinkStats);
router.get('/analysis', getBacklinkAnalysis);
router.get('/:id', getBacklinkById);
router.post('/', createBacklink);
router.delete('/:id', deleteBacklink);

export default router;
