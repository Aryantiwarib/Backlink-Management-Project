import mongoose from 'mongoose';

/**
 * Clean and normalize domain name
 * Strips http://, https://, www., port, path, query parameters and trailing slashes.
 * e.g. "https://www.TechCrunch.com/2026/01/post?ref=1" -> "techcrunch.com"
 */
export function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim().toLowerCase();

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');

  // Remove auth, path, query, hash
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

  // Remove port if present
  cleaned = cleaned.split(':')[0];

  // Remove leading www.
  cleaned = cleaned.replace(/^www\./i, '');

  return cleaned.trim();
}

const prospectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Prospect must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Prospect must belong to a website'],
      index: true
    },
    prospectDomain: {
      type: String,
      required: [true, 'Prospect domain is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    prospectUrl: {
      type: String,
      required: [true, 'Prospect URL is required'],
      trim: true
    },
    source: {
      type: String,
      enum: ['competitor', 'keyword', 'directory', 'manual'],
      default: 'competitor',
      index: true
    },
    discoveredFrom: {
      type: String,
      default: '',
      trim: true
    },
    discoveryKeyword: {
      type: String,
      default: '',
      trim: true
    },
    competitorDomains: {
      type: [String],
      default: () => []
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
    spamScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    relevanceCategory: {
      type: String,
      default: '',
      trim: true
    },
    opportunityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      index: true
    },
    opportunityFactors: {
      type: [
        {
          factor: String,
          points: Number,
          description: String
        }
      ],
      default: () => []
    },
    status: {
      type: String,
      enum: ['new', 'saved', 'reviewed', 'qualified', 'rejected'],
      default: 'saved',
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    tags: {
      type: [String],
      default: () => []
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true
    },
    lastContactedAt: {
      type: Date,
      default: null
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure prospectDomain is always clean and normalized
prospectSchema.pre('save', function (next) {
  if (this.prospectDomain) {
    this.prospectDomain = normalizeDomain(this.prospectDomain);
  } else if (this.prospectUrl) {
    this.prospectDomain = normalizeDomain(this.prospectUrl);
  }
  if (typeof next === 'function') next();
});

// Compound unique index: prevents duplicate prospects for the same user and website
prospectSchema.index({ userId: 1, websiteId: 1, prospectDomain: 1 }, { unique: true });

// Compound query indexes for efficient filtering and sorting
prospectSchema.index({ websiteId: 1, status: 1, opportunityScore: -1 });
prospectSchema.index({ websiteId: 1, source: 1, createdAt: -1 });
prospectSchema.index({ websiteId: 1, domainAuthority: -1 });
prospectSchema.index({ websiteId: 1, createdAt: -1 });

// Safe public serialization
prospectSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    prospectDomain: this.prospectDomain,
    prospectUrl: this.prospectUrl,
    source: this.source,
    discoveredFrom: this.discoveredFrom,
    discoveryKeyword: this.discoveryKeyword,
    competitorDomains: this.competitorDomains || [],
    domainAuthority: this.domainAuthority,
    pageAuthority: this.pageAuthority,
    spamScore: this.spamScore,
    relevanceCategory: this.relevanceCategory,
    opportunityScore: this.opportunityScore,
    opportunityFactors: this.opportunityFactors || [],
    status: this.status,
    notes: this.notes,
    tags: this.tags || [],
    contactEmail: this.contactEmail,
    lastContactedAt: this.lastContactedAt,
    metrics: this.metrics || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Prospect = mongoose.models.Prospect || mongoose.model('Prospect', prospectSchema);

export default Prospect;
