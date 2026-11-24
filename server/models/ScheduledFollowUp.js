import mongoose from 'mongoose';

export const FOLLOW_UP_STATUSES = ['scheduled', 'executed', 'cancelled', 'skipped'];

const scheduledFollowUpSchema = new mongoose.Schema(
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
      required: [true, 'Campaign Prospect Assignment ID is required'],
      index: true
    },
    parentEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutreachEmail',
      default: null
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled follow-up date is required'],
      index: true
    },
    status: {
      type: String,
      enum: FOLLOW_UP_STATUSES,
      default: 'scheduled',
      index: true
    },
    skipReason: {
      type: String,
      default: ''
    },
    executedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
scheduledFollowUpSchema.index({ campaignId: 1, status: 1 });
scheduledFollowUpSchema.index({ status: 1, scheduledDate: 1 });

scheduledFollowUpSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    campaignId: this.campaignId.toString(),
    prospectId: this.prospectId.toString(),
    assignmentId: this.assignmentId.toString(),
    parentEmailId: this.parentEmailId ? this.parentEmailId.toString() : null,
    templateId: this.templateId ? this.templateId.toString() : null,
    scheduledDate: this.scheduledDate,
    status: this.status,
    skipReason: this.skipReason,
    executedAt: this.executedAt,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const ScheduledFollowUp =
  mongoose.models.ScheduledFollowUp ||
  mongoose.model('ScheduledFollowUp', scheduledFollowUpSchema);

export default ScheduledFollowUp;
