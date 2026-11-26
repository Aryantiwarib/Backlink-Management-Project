import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * AssistantConversation Model
 * Stores conversation threads between authenticated users and the LINKORA AI SEO Assistant.
 * Strictly scoped by userId and optionally associated with an active website context.
 */
const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    toolCalls: [
      {
        id: { type: String },
        name: { type: String },
        args: { type: mongoose.Schema.Types.Mixed },
        result: { type: mongoose.Schema.Types.Mixed }
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const assistantConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Conversation must belong to an authenticated user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      default: null,
      index: true
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: [120, 'Conversation title cannot exceed 120 characters']
    },
    messages: [messageSchema],
    metadata: {
      model: {
        type: String,
        default: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },
      totalTokens: {
        type: Number,
        default: 0
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast user conversation lookups sorted by activity
assistantConversationSchema.index({ userId: 1, 'metadata.lastActiveAt': -1 });
assistantConversationSchema.index({ userId: 1, websiteId: 1, 'metadata.lastActiveAt': -1 });

// Helper method to convert to safe public object
assistantConversationSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId ? this.websiteId.toString() : null,
    title: this.title,
    messages: this.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls || [],
      createdAt: m.createdAt
    })),
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const AssistantConversation = mongoose.models.AssistantConversation || mongoose.model('AssistantConversation', assistantConversationSchema);

export default AssistantConversation;
