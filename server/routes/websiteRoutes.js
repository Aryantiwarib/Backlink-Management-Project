import express from 'express';
import {
  createWebsite,
  getWebsites,
  getActiveWebsite,
  getWebsiteById,
  updateWebsite,
  deleteWebsite,
  setActiveWebsite,
  verifyDomain
} from '../controllers/websiteController.js';

const router = express.Router();

// Specific routes first
router.get('/active', getActiveWebsite);

// Collection routes
router.post('/', createWebsite);
router.get('/', getWebsites);

// Param routes
router.get('/:id', getWebsiteById);
router.put('/:id', updateWebsite);
router.delete('/:id', deleteWebsite);
router.put('/:id/active', setActiveWebsite);
router.post('/:id/verify', verifyDomain);

export default router;
