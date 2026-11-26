import express from 'express';
import { assistantController } from '../controllers/assistantController.js';

const router = express.Router();

// Conversation collection routes
router.get('/conversations', assistantController.listConversations);
router.post('/conversations', assistantController.createConversation);

// Single conversation & message routes
router.get('/conversations/:id', assistantController.getConversation);
router.post('/conversations/:id/messages', assistantController.sendMessage);
router.delete('/conversations/:id', assistantController.deleteConversation);
router.delete('/conversations/:id/messages', assistantController.clearMessages);

export default router;
