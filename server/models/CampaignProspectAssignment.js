import mongoose from 'mongoose';

export const OUTREACH_STATUSES = [
  'uncontacted',
  'contacted',
  'follow_up_due',
  'replied',
  'negotiating',
  'link_acquired',
  'rejected',
  'unresponsive'
];

const campaignProspectAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assignment must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Assignment must belong to a website'],
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Assignment must reference a campaign'],
      index: true
    },
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect',
      required: [true, 'Assignment must reference an existing Phase 9 prospect'],
      index: true
    },
    outreachStatus: {
      type: String,
      enum: {
        values: OUTREACH_STATUSES,
        message: '{VALUE} is not a valid outreach status'
      },
      default: 'uncontacted',
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    contactedAt: {
      type: Date,
      default: null
    },
    followUpAt: {
      type: Date,
      default: null
    },
    acquiredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: guarantees a prospect can only be assigned once per campaign,
// while allowing the same prospect to belong to multiple distinct campaigns.
campaignProspectAssignmentSchema.index({ campaignId: 1, prospectId: 1 }, { unique: true });

// Compound query indexes for high-speed dashboard, filtering and status aggregation
campaignProspectAssignmentSchema.index({ websiteId: 1, campaignId: 1, outreachStatus: 1 });
campaignProspectAssignmentSchema.index({ userId: 1, websiteId: 1, campaignId: 1 });
campaignProspectAssignmentSchema.index({ campaignId: 1, assignedAt: -1 });

// Safe public serialization
campaignProspectAssignmentSchema.methods.toSafeObject = function () {
  const obj = {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    campaignId: this.campaignId._id ? this.campaignId._id.toString() : this.campaignId.toString(),
    prospectId: this.prospectId._id ? this.prospectId._id.toString() : this.prospectId.toString(),
    outreachStatus: this.outreachStatus,
    notes: this.notes,
    assignedAt: this.assignedAt,
    contactedAt: this.contactedAt,
    followUpAt: this.followUpAt,
    acquiredAt: this.acquiredAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  // If prospect was populated
  if (this.prospectId && typeof this.prospectId === 'object' && this.prospectId.prospectDomain) {
    obj.prospect = {
      id: this.prospectId._id.toString(),
      prospectDomain: this.prospectId.prospectDomain,
      prospectUrl: this.prospectId.prospectUrl,
      domainAuthority: this.prospectId.domainAuthority,
      pageAuthority: this.prospectId.pageAuthority,
      spamScore: this.prospectId.spamScore,
      opportunityScore: this.prospectId.opportunityScore,
      opportunityFactors: this.prospectId.opportunityFactors || [],
      globalStatus: this.prospectId.status,
      source: this.prospectId.source,
      contactEmail: this.prospectId.contactEmail
    };
  }

  return obj;
};

const CampaignProspectAssignment =
  mongoose.models.CampaignProspectAssignment ||
  mongoose.model('CampaignProspectAssignment', campaignProspectAssignmentSchema);

export default CampaignProspectAssignment;
