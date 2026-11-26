import { assistantService } from '../services/assistantService.js';

export const assistantController = {
  /**
   * List all user conversations
   * GET /api/assistant/conversations
   */
  async listConversations(req, res, next) {
    try {
      const userId = req.user._id;
      const { websiteId, limit } = req.query;

      const conversations = await assistantService.listConversations({
        userId,
        websiteId,
        limit: limit ? parseInt(limit, 10) : 50
      });

      return res.status(200).json({
        success: true,
        conversations
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single conversation with full message history
   * GET /api/assistant/conversations/:id
   */
  async getConversation(req, res, next) {
    try {
      const userId = req.user._id;
      const conversationId = req.params.id;

      const conversation = await assistantService.getConversationById({
        userId,
        conversationId
      });

      return res.status(200).json({
        success: true,
        conversation
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * Create new conversation thread
   * POST /api/assistant/conversations
   */
  async createConversation(req, res, next) {
    try {
      const userId = req.user._id;
      const { websiteId, title, initialMessage } = req.body;

      const conversation = await assistantService.createConversation({
        userId,
        websiteId,
        title,
        initialMessage
      });

      return res.status(201).json({
        success: true,
        conversation
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Send message to existing conversation
   * POST /api/assistant/conversations/:id/messages
   */
  async sendMessage(req, res, next) {
    try {
      const userId = req.user._id;
      const conversationId = req.params.id;
      const { content, websiteId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required.'
        });
      }

      const conversation = await assistantService.sendMessage({
        userId,
        conversationId,
        content,
        websiteId
      });

      return res.status(200).json({
        success: true,
        conversation
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * Delete conversation thread
   * DELETE /api/assistant/conversations/:id
   */
  async deleteConversation(req, res, next) {
    try {
      const userId = req.user._id;
      const conversationId = req.params.id;

      const result = await assistantService.deleteConversation({
        userId,
        conversationId
      });

      return res.status(200).json(result);
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * Clear message history inside conversation
   * DELETE /api/assistant/conversations/:id/messages
   */
  async clearMessages(req, res, next) {
    try {
      const userId = req.user._id;
      const conversationId = req.params.id;

      const conversation = await assistantService.clearMessages({
        userId,
        conversationId
      });

      return res.status(200).json({
        success: true,
        conversation
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
};
