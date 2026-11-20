import express from 'express';
import { createCampaign, getCampaigns } from '../controllers/campaignController.js';

const router = express.Router();

router.get('/', getCampaigns);
router.post('/', createCampaign);

export default router;
