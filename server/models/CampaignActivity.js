import mongoose from 'mongoose';

const campaignActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Activity must belong to a website'],
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Activity must reference a campaign'],
      index: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignProspectAssignment',
      default: null
    },
    action: {
      type: String,
      required: [true, 'Activity action is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true
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

// High performance timeline index
campaignActivitySchema.index({ campaignId: 1, createdAt: -1 });
campaignActivitySchema.index({ websiteId: 1, createdAt: -1 });

campaignActivitySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    campaignId: this.campaignId.toString(),
    assignmentId: this.assignmentId ? this.assignmentId.toString() : null,
    action: this.action,
    description: this.description,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const CampaignActivity =
  mongoose.models.CampaignActivity ||
  mongoose.model('CampaignActivity', campaignActivitySchema);

export default CampaignActivity;
