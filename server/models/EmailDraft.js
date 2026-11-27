import mongoose from 'mongoose';

export const EMAIL_PURPOSES = [
  'Backlink Request',
  'Guest Post Outreach',
  'Link Insertion Request',
  'Collaboration Request',
  'Partnership Proposal',
  'First Outreach',
  'Follow-up Email',
  'Custom Email'
];

export const EMAIL_TONES = [
  'Professional',
  'Friendly',
  'Formal',
  'Casual',
  'Persuasive',
  'Confident',
  'Natural and Human',
  'Follow-up'
];

export const EMAIL_LENGTHS = ['Short', 'Medium', 'Detailed'];

const emailRevisionSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      default: '',
      trim: true
    },
    body: {
      type: String,
      default: '',
      trim: true
    },
    actionTaken: {
      type: String,
      default: 'initial_generation'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const emailVariationSchema = new mongoose.Schema(
  {
    variationId: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    opening: {
      type: String,
      default: ''
    },
    valueProposition: {
      type: String,
      default: ''
    },
    callToAction: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const emailDraftSchema = new mongoose.Schema(
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
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect',
      default: null,
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true
    },
    recipientName: {
      type: String,
      default: '',
      trim: true
    },
    recipientWebsite: {
      type: String,
      default: '',
      trim: true
    },
    companyName: {
      type: String,
      default: '',
      trim: true
    },
    recipientEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    emailPurpose: {
      type: String,
      enum: EMAIL_PURPOSES,
      default: 'Backlink Request'
    },
    tone: {
      type: String,
      enum: EMAIL_TONES,
      default: 'Professional'
    },
    emailLength: {
      type: String,
      enum: EMAIL_LENGTHS,
      default: 'Medium'
    },
    customInstructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Custom instructions cannot exceed 2000 characters']
    },
    subject: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Subject cannot exceed 500 characters']
    },
    body: {
      type: String,
      default: '',
      trim: true,
      maxlength: [20000, 'Body cannot exceed 20000 characters']
    },
    variations: {
      type: [emailVariationSchema],
      default: () => []
    },
    revisions: {
      type: [emailRevisionSchema],
      default: () => []
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'used', 'discarded'],
      default: 'draft',
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

// Indexes for fast lookup
emailDraftSchema.index({ userId: 1, websiteId: 1, createdAt: -1 });
emailDraftSchema.index({ userId: 1, prospectId: 1 });
emailDraftSchema.index({ userId: 1, campaignId: 1 });

emailDraftSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    prospectId: this.prospectId ? this.prospectId.toString() : null,
    campaignId: this.campaignId ? this.campaignId.toString() : null,
    recipientName: this.recipientName,
    recipientWebsite: this.recipientWebsite,
    companyName: this.companyName,
    recipientEmail: this.recipientEmail,
    emailPurpose: this.emailPurpose,
    tone: this.tone,
    emailLength: this.emailLength,
    customInstructions: this.customInstructions,
    subject: this.subject,
    body: this.body,
    variations: (this.variations || []).map((v) => ({
      id: v._id ? v._id.toString() : v.variationId,
      variationId: v.variationId,
      subject: v.subject,
      body: v.body,
      opening: v.opening,
      valueProposition: v.valueProposition,
      callToAction: v.callToAction
    })),
    revisions: (this.revisions || []).map((r) => ({
      id: r._id ? r._id.toString() : null,
      subject: r.subject,
      body: r.body,
      actionTaken: r.actionTaken,
      createdAt: r.createdAt
    })),
    status: this.status,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const EmailDraft = mongoose.models.EmailDraft || mongoose.model('EmailDraft', emailDraftSchema);

export default EmailDraft;
