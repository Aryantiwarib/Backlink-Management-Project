import mongoose from 'mongoose';
import AssistantConversation from '../models/AssistantConversation.js';
import Website from '../models/Website.js';
import { generateAssistantResponse } from './openaiService.js';

export const assistantService = {
  /**
   * List all conversation threads for an authenticated user
   */
  async listConversations({ userId, websiteId, limit = 50 }) {
    if (!userId) throw new Error('User ID is required');

    const query = { userId };
    if (websiteId && mongoose.Types.ObjectId.isValid(websiteId)) {
      query.websiteId = websiteId;
    }

    const conversations = await AssistantConversation.find(query)
      .sort({ 'metadata.lastActiveAt': -1, updatedAt: -1 })
      .limit(Math.min(limit, 100))
      .select('title websiteId metadata createdAt updatedAt messages')
      .lean();

    return conversations.map((c) => {
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      return {
        id: c._id.toString(),
        _id: c._id.toString(),
        title: c.title || 'New Conversation',
        websiteId: c.websiteId ? c.websiteId.toString() : null,
        messageCount: c.messages ? c.messages.length : 0,
        lastMessage: lastMsg ? {
          role: lastMsg.role,
          content: lastMsg.content.slice(0, 100),
          createdAt: lastMsg.createdAt
        } : null,
        lastActiveAt: c.metadata?.lastActiveAt || c.updatedAt,
        createdAt: c.createdAt
      };
    });
  },

  /**
   * Get a single conversation with full message history
   */
  async getConversationById({ userId, conversationId }) {
    if (!userId || !conversationId) throw new Error('User ID and Conversation ID are required');

    const conversation = await AssistantConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation.toSafeObject();
  },

  /**
   * Create a new conversation thread
   */
  async createConversation({ userId, websiteId, title, initialMessage }) {
    if (!userId) throw new Error('User ID is required');

    let validWebsiteId = null;
    let websiteDomain = '';
    let websiteName = '';

    if (websiteId && mongoose.Types.ObjectId.isValid(websiteId)) {
      const site = await Website.findOne({ _id: websiteId, userId });
      if (site) {
        validWebsiteId = site._id;
        websiteDomain = site.domain;
        websiteName = site.name;
      }
    }

    if (!validWebsiteId) {
      const defaultSite = await Website.findOne({ userId, isActive: true }) || await Website.findOne({ userId });
      if (defaultSite) {
        validWebsiteId = defaultSite._id;
        websiteDomain = defaultSite.domain;
        websiteName = defaultSite.name;
      }
    }

    const conversation = new AssistantConversation({
      userId,
      websiteId: validWebsiteId,
      title: title?.trim() || (initialMessage ? initialMessage.slice(0, 40) + (initialMessage.length > 40 ? '...' : '') : 'New Conversation'),
      messages: []
    });

    // If an initial message was supplied, process it immediately
    if (initialMessage && initialMessage.trim()) {
      const userText = initialMessage.trim();
      conversation.messages.push({
        role: 'user',
        content: userText
      });

      const aiResponse = await generateAssistantResponse({
        messages: [{ role: 'user', content: userText }],
        context: {
          userId,
          websiteId: validWebsiteId ? validWebsiteId.toString() : null,
          websiteDomain,
          websiteName
        }
      });

      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.content,
        toolCalls: aiResponse.toolCalls || []
      });

      conversation.metadata.model = aiResponse.model;
      conversation.metadata.totalTokens = (aiResponse.usage?.total_tokens || 0);
      conversation.metadata.lastActiveAt = new Date();
    }

    await conversation.save();
    return conversation.toSafeObject();
  },

  /**
   * Send a user message to an existing conversation and receive AI response
   */
  async sendMessage({ userId, conversationId, content, websiteId }) {
    if (!userId || !conversationId) throw new Error('User ID and Conversation ID are required');
    if (!content || !content.trim()) throw new Error('Message content cannot be empty');

    const conversation = await AssistantConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Resolve target website context
    let targetWebsiteId = websiteId || conversation.websiteId;
    let websiteDoc = null;

    if (targetWebsiteId && mongoose.Types.ObjectId.isValid(targetWebsiteId)) {
      websiteDoc = await Website.findOne({ _id: targetWebsiteId, userId });
    }
    if (!websiteDoc) {
      websiteDoc = await Website.findOne({ userId, isActive: true }) || await Website.findOne({ userId });
    }

    if (websiteDoc && (!conversation.websiteId || conversation.websiteId.toString() !== websiteDoc._id.toString())) {
      conversation.websiteId = websiteDoc._id;
    }

    const userText = content.trim();

    // Auto-update default title if first user prompt
    if (conversation.title === 'New Conversation' || conversation.messages.length === 0) {
      conversation.title = userText.slice(0, 40) + (userText.length > 40 ? '...' : '');
    }

    // Append user message
    conversation.messages.push({
      role: 'user',
      content: userText
    });

    // Take recent messages for context window (last 10 messages)
    const contextMessages = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content
    }));

    // Call OpenAI with tools and active website context
    const aiResponse = await generateAssistantResponse({
      messages: contextMessages,
      context: {
        userId,
        websiteId: websiteDoc ? websiteDoc._id.toString() : null,
        websiteDomain: websiteDoc?.domain || '',
        websiteName: websiteDoc?.name || ''
      }
    });

    // Append assistant response
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse.content,
      toolCalls: aiResponse.toolCalls || []
    });

    conversation.metadata.model = aiResponse.model;
    if (aiResponse.usage?.total_tokens) {
      conversation.metadata.totalTokens += aiResponse.usage.total_tokens;
    }
    conversation.metadata.lastActiveAt = new Date();

    await conversation.save();
    return conversation.toSafeObject();
  },

  /**
   * Delete an entire conversation thread
   */
  async deleteConversation({ userId, conversationId }) {
    if (!userId || !conversationId) throw new Error('User ID and Conversation ID are required');

    const deleted = await AssistantConversation.findOneAndDelete({
      _id: conversationId,
      userId
    });

    if (!deleted) {
      throw new Error('Conversation not found or access denied');
    }

    return { success: true, message: 'Conversation deleted successfully' };
  },

  /**
   * Clear message history inside an existing conversation
   */
  async clearMessages({ userId, conversationId }) {
    if (!userId || !conversationId) throw new Error('User ID and Conversation ID are required');

    const conversation = await AssistantConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    conversation.messages = [];
    conversation.title = 'New Conversation';
    conversation.metadata.lastActiveAt = new Date();
    await conversation.save();

    return conversation.toSafeObject();
  }
};
