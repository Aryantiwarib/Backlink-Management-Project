import mongoose from 'mongoose';

export const EMAIL_EVENT_TYPES = [
  'queued',
  'sent',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'failed',
  'retried'
];

const emailActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Website ID is required'],
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect',
      required: [true, 'Prospect ID is required'],
      index: true
    },
    outreachEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutreachEmail',
      default: null,
      index: true
    },
    eventType: {
      type: String,
      enum: EMAIL_EVENT_TYPES,
      required: [true, 'Event type is required'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
emailActivitySchema.index({ campaignId: 1, createdAt: -1 });
emailActivitySchema.index({ prospectId: 1, createdAt: -1 });
emailActivitySchema.index({ outreachEmailId: 1, createdAt: -1 });

emailActivitySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    campaignId: this.campaignId.toString(),
    prospectId: this.prospectId.toString(),
    outreachEmailId: this.outreachEmailId ? this.outreachEmailId.toString() : null,
    eventType: this.eventType,
    description: this.description,
    metadata: this.metadata || {},
    createdAt: this.createdAt
  };
};

const EmailActivity =
  mongoose.models.EmailActivity ||
  mongoose.model('EmailActivity', emailActivitySchema);

export default EmailActivity;
