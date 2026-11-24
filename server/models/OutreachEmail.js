import mongoose from 'mongoose';
import crypto from 'crypto';

export const OUTREACH_EMAIL_STATUSES = ['pending', 'processing', 'sent', 'failed', 'cancelled'];

const outreachEmailSchema = new mongoose.Schema(
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
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignProspectAssignment',
      default: null,
      index: true
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConnectedEmailAccount',
      required: [true, 'Connected email account is required']
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    recipientName: {
      type: String,
      default: '',
      trim: true
    },
    senderEmail: {
      type: String,
      required: [true, 'Sender email is required'],
      lowercase: true,
      trim: true
    },
    senderName: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [500, 'Subject cannot exceed 500 characters']
    },
    bodyHtml: {
      type: String,
      required: [true, 'HTML body is required']
    },
    bodyText: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: OUTREACH_EMAIL_STATUSES,
      default: 'pending',
      index: true
    },
    gmailMessageId: {
      type: String,
      default: null,
      index: true
    },
    gmailThreadId: {
      type: String,
      default: null,
      index: true
    },
    trackingId: {
      type: String,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(16).toString('hex')
    },
    openedAt: {
      type: Date,
      default: null
    },
    openCount: {
      type: Number,
      default: 0
    },
    clickedAt: {
      type: Date,
      default: null
    },
    clickCount: {
      type: Number,
      default: 0
    },
    repliedAt: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: ''
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
outreachEmailSchema.index({ campaignId: 1, status: 1 });
outreachEmailSchema.index({ userId: 1, websiteId: 1, createdAt: -1 });
outreachEmailSchema.index({ status: 1, scheduledFor: 1, attempts: 1 });

outreachEmailSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    campaignId: this.campaignId.toString(),
    prospectId: this.prospectId.toString(),
    assignmentId: this.assignmentId ? this.assignmentId.toString() : null,
    templateId: this.templateId ? this.templateId.toString() : null,
    recipientEmail: this.recipientEmail,
    recipientName: this.recipientName,
    senderEmail: this.senderEmail,
    senderName: this.senderName,
    subject: this.subject,
    bodyHtml: this.bodyHtml,
    bodyText: this.bodyText,
    status: this.status,
    gmailMessageId: this.gmailMessageId,
    gmailThreadId: this.gmailThreadId,
    trackingId: this.trackingId,
    openedAt: this.openedAt,
    openCount: this.openCount,
    clickedAt: this.clickedAt,
    clickCount: this.clickCount,
    repliedAt: this.repliedAt,
    sentAt: this.sentAt,
    failedAt: this.failedAt,
    errorMessage: this.errorMessage,
    attempts: this.attempts,
    scheduledFor: this.scheduledFor,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const OutreachEmail =
  mongoose.models.OutreachEmail ||
  mongoose.model('OutreachEmail', outreachEmailSchema);

export default OutreachEmail;
