import mongoose from 'mongoose';

/**
 * Backlink Model
 * Stores individual backlink records associated with a verified or tracked website in Linkora.
 * Guarantees duplicate prevention via a unique compound index on (websiteId, sourceUrl, targetUrl).
 */
const backlinkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Backlink must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Backlink must belong to a website'],
      index: true
    },
    sourceUrl: {
      type: String,
      required: [true, 'Source URL (linking page) is required'],
      trim: true
    },
    sourceDomain: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true
    },
    targetUrl: {
      type: String,
      required: [true, 'Target URL (landing page) is required'],
      trim: true
    },
    anchorText: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Anchor text cannot exceed 500 characters']
    },
    linkType: {
      type: String,
      enum: ['dofollow', 'nofollow', 'unknown'],
      default: 'unknown',
      index: true
    },
    sourceDomainAuthority: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    sourcePageAuthority: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    firstSeen: {
      type: Date,
      default: null
    },
    lastSeen: {
      type: Date,
      default: null
    },
    provider: {
      type: String,
      default: 'moz',
      trim: true,
      lowercase: true
    },
    status: {
      type: String,
      enum: ['active', 'lost', 'broken'],
      default: 'active',
      index: true
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Helper to extract clean domain from URL
export function extractDomainFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return url.split('/')[0].replace(/^www\./, '').toLowerCase();
  }
}

// Pre-save hook to ensure sourceDomain is always populated
backlinkSchema.pre('save', function (next) {
  if (!this.sourceDomain && this.sourceUrl) {
    this.sourceDomain = extractDomainFromUrl(this.sourceUrl);
  }
  if (typeof next === 'function') next();
});

// Compound Unique Index: prevents duplicate backlinks for the same website
// Repeated fetches will upsert based on this compound key.
backlinkSchema.index({ websiteId: 1, sourceUrl: 1, targetUrl: 1 }, { unique: true });

// Compound Query Indexes for efficient retrieval, search, filter and sorting
backlinkSchema.index({ userId: 1, websiteId: 1, fetchedAt: -1 });
backlinkSchema.index({ userId: 1, websiteId: 1, sourceDomain: 1 });
backlinkSchema.index({ userId: 1, websiteId: 1, linkType: 1, fetchedAt: -1 });
backlinkSchema.index({ websiteId: 1, status: 1 });

// Helper to convert to safe public DTO
backlinkSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    sourceUrl: this.sourceUrl,
    sourceDomain: this.sourceDomain || extractDomainFromUrl(this.sourceUrl),
    targetUrl: this.targetUrl,
    anchorText: this.anchorText,
    linkType: this.linkType,
    sourceDomainAuthority: this.sourceDomainAuthority,
    sourcePageAuthority: this.sourcePageAuthority,
    firstSeen: this.firstSeen,
    lastSeen: this.lastSeen,
    provider: this.provider,
    status: this.status,
    fetchedAt: this.fetchedAt,
    meta: this.meta || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Backlink = mongoose.models.Backlink || mongoose.model('Backlink', backlinkSchema);

export default Backlink;
