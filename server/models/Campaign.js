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

export const DISCOVERY_STATUSES = [
  'pending',
  'discovering',
  'enriching',
  'filtering',
  'assigning',
  'completed',
  'completed_with_warnings',
  'failed'
];

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
    },

    // Phase 10 Upgrade: Automated Discovery Configuration
    niche: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Niche cannot exceed 200 characters']
    },
    primaryKeywords: {
      type: [String],
      default: () => []
    },
    additionalKeywords: {
      type: [String],
      default: () => []
    },
    competitorDomains: {
      type: [String],
      default: () => []
    },
    targetProspects: {
      type: Number,
      default: 50,
      min: [1, 'Target prospects must be at least 1']
    },

    // Prospect Qualification Criteria
    qualificationCriteria: {
      minDomainAuthority: { type: Number, default: 20, min: 0, max: 100 },
      minPageAuthority: { type: Number, default: 0, min: 0, max: 100 },
      maxSpamScore: { type: Number, default: 30, min: 0, max: 100 },
      minOpportunityScore: { type: Number, default: 50, min: 0, max: 100 },
      relevantCategories: { type: [String], default: () => [] },
      excludedDomains: { type: [String], default: () => [] },
      excludeContacted: { type: Boolean, default: true },
      excludeRejected: { type: Boolean, default: true }
    },

    // Discovery Sources
    discoverySources: {
      enableKeywordDiscovery: { type: Boolean, default: true },
      enableCompetitorDiscovery: { type: Boolean, default: true }
    },

    // Discovery Status & Summary
    discoveryStatus: {
      type: String,
      enum: {
        values: DISCOVERY_STATUSES,
        message: '{VALUE} is not a valid discovery status'
      },
      default: 'pending',
      index: true
    },
    discoverySummary: {
      keywordResultsCount: { type: Number, default: 0 },
      competitorResultsCount: { type: Number, default: 0 },
      totalDiscovered: { type: Number, default: 0 },
      uniqueDomainsCount: { type: Number, default: 0 },
      duplicateCount: { type: Number, default: 0 },
      enrichmentSuccessCount: { type: Number, default: 0 },
      enrichmentFailureCount: { type: Number, default: 0 },
      qualifiedCount: { type: Number, default: 0 },
      provisionalCount: { type: Number, default: 0 },
      rejectedCount: { type: Number, default: 0 },
      rejectionBreakdown: {
        previouslyContacted: { type: Number, default: 0 },
        previouslyRejected: { type: Number, default: 0 },
        daBelowThreshold: { type: Number, default: 0 },
        paBelowThreshold: { type: Number, default: 0 },
        spamAboveThreshold: { type: Number, default: 0 },
        scoreBelowThreshold: { type: Number, default: 0 },
        userExcluded: { type: Number, default: 0 }
      },
      assignedCount: { type: Number, default: 0 },
      contactEmailsFoundCount: { type: Number, default: 0 },
      contactDiscoveryProgress: {
        total: { type: Number, default: 0 },
        processed: { type: Number, default: 0 },
        status: { type: String, enum: ['idle', 'running', 'completed', 'failed'], default: 'idle' },
        error: { type: String, default: '' },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null }
      },
      errors: [
        {
          source: { type: String, default: '' },
          message: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      warnings: [
        {
          source: { type: String, default: '' },
          message: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null }
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
campaignSchema.index({ websiteId: 1, discoveryStatus: 1 });

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
    niche: this.niche || '',
    primaryKeywords: this.primaryKeywords || [],
    additionalKeywords: this.additionalKeywords || [],
    competitorDomains: this.competitorDomains || [],
    targetProspects: this.targetProspects || 50,
    qualificationCriteria: this.qualificationCriteria || {
      minDomainAuthority: 20,
      minPageAuthority: 0,
      maxSpamScore: 30,
      minOpportunityScore: 40,
      relevantCategories: [],
      excludedDomains: [],
      excludeContacted: true,
      excludeRejected: true
    },
    discoverySources: this.discoverySources || {
      enableKeywordDiscovery: true,
      enableCompetitorDiscovery: true
    },
    discoveryStatus: this.discoveryStatus || 'pending',
    discoverySummary: this.discoverySummary || {
      keywordResultsCount: 0,
      competitorResultsCount: 0,
      totalDiscovered: 0,
      uniqueDomainsCount: 0,
      duplicateCount: 0,
      enrichmentSuccessCount: 0,
      enrichmentFailureCount: 0,
      qualifiedCount: 0,
      provisionalCount: 0,
      rejectedCount: 0,
      rejectionBreakdown: {
        previouslyContacted: 0,
        previouslyRejected: 0,
        daBelowThreshold: 0,
        paBelowThreshold: 0,
        spamAboveThreshold: 0,
        scoreBelowThreshold: 0,
        userExcluded: 0
      },
      assignedCount: 0,
      contactEmailsFoundCount: 0,
      contactDiscoveryProgress: { total: 0, processed: 0, status: 'idle', error: '', startedAt: null, completedAt: null },
      errors: [],
      warnings: [],
      startedAt: null,
      completedAt: null
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

export default Campaign;
