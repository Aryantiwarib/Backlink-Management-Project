import mongoose from 'mongoose';

export const CAMPAIGN_TYPES = [
  'Guest Posting',
  'Directory Submission',
  'Resource Page Outreach',
  'Competitor Link Acquisition',
  'Broken Link Building',
  'General Link Building',
  'Digital PR'
];

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Campaign must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Campaign must belong to a website'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [200, 'Campaign name cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    campaignType: {
      type: String,
      required: [true, 'Campaign type is required'],
      enum: {
        values: CAMPAIGN_TYPES,
        message: '{VALUE} is not a supported campaign type'
      },
      default: 'General Link Building',
      index: true
    },
    objective: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Objective cannot exceed 1000 characters']
    },
    targetBacklinks: {
      type: Number,
      default: 0,
      min: [0, 'Target backlinks cannot be negative']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value || !this.startDate) return true;
          return new Date(value) >= new Date(this.startDate);
        },
        message: 'End date cannot be earlier than start date'
      }
    },
    status: {
      type: String,
      enum: {
        values: CAMPAIGN_STATUSES,
        message: '{VALUE} is not a valid campaign status'
      },
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for high-frequency queries
campaignSchema.index({ userId: 1, websiteId: 1, status: 1 });
campaignSchema.index({ websiteId: 1, createdAt: -1 });
campaignSchema.index({ websiteId: 1, status: 1, campaignType: 1 });

// Safe public DTO conversion
campaignSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    name: this.name,
    description: this.description,
    campaignType: this.campaignType,
    objective: this.objective,
    targetBacklinks: this.targetBacklinks,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

export default Campaign;
