import express from 'express';
import {
  generateEmail,
  modifyEmail,
  saveDraft,
  listDrafts,
  getDraft,
  deleteDraft
} from '../controllers/aiEmailController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// All AI Email Generation and Studio routes require authentication
router.use(ensureAuthenticated);

// AI Generation & Modification
router.post('/generate', generateEmail);
router.post('/modify', modifyEmail);

// Drafts Management CRUD
router.post('/drafts', saveDraft);
router.get('/drafts', listDrafts);
router.get('/drafts/:draftId', getDraft);
router.delete('/drafts/:draftId', deleteDraft);

export default router;
