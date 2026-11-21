import mongoose from 'mongoose';

/**
 * SeoSnapshot Model
 * Stores historical snapshots of SEO and authority metrics for a website.
 * These time-series snapshots provide the historical basis for future growth charts,
 * authority tracking, and delta calculations in Phase 6.
 */
const seoSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Snapshot must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Snapshot must belong to a website'],
      index: true
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    provider: {
      type: String,
      required: [true, 'Provider identifier is required'],
      default: 'moz',
      trim: true,
      lowercase: true
    },
    domainAuthority: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    pageAuthority: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    totalBacklinks: {
      type: Number,
      default: null,
      min: 0
    },
    referringDomains: {
      type: Number,
      default: null,
      min: 0
    },
    spamScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    crawledPages: {
      type: Number,
      default: null,
      min: 0
    },
    dofollowBacklinks: {
      type: Number,
      default: null,
      min: 0
    },
    nofollowBacklinks: {
      type: Number,
      default: null,
      min: 0
    },
    brokenBacklinks: {
      type: Number,
      default: null,
      min: 0
    },
    metricsAvailability: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    snapshotDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    fetchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound Query Indexes for efficient time-series and latest snapshot retrieval
seoSnapshotSchema.index({ websiteId: 1, snapshotDate: -1 });
seoSnapshotSchema.index({ userId: 1, websiteId: 1, snapshotDate: -1 });
seoSnapshotSchema.index({ domain: 1, snapshotDate: -1 });

// Helper to convert to safe public DTO
seoSnapshotSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    domain: this.domain,
    provider: this.provider,
    domainAuthority: this.domainAuthority,
    pageAuthority: this.pageAuthority,
    totalBacklinks: this.totalBacklinks,
    referringDomains: this.referringDomains,
    spamScore: this.spamScore,
    crawledPages: this.crawledPages,
    dofollowBacklinks: this.dofollowBacklinks,
    nofollowBacklinks: this.nofollowBacklinks,
    brokenBacklinks: this.brokenBacklinks,
    metricsAvailability: this.metricsAvailability,
    snapshotDate: this.snapshotDate,
    fetchedAt: this.fetchedAt,
    createdAt: this.createdAt
  };
};

const SeoSnapshot = mongoose.models.SeoSnapshot || mongoose.model('SeoSnapshot', seoSnapshotSchema);

export default SeoSnapshot;
