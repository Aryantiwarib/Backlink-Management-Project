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
    qualificationStatus: {
      type: String,
      enum: ['qualified', 'provisional', 'rejected', 'unassessed'],
      default: 'unassessed',
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
      trim: true,
      lowercase: true,
      index: true
    },
    contactEmails: [
      {
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true
        },
        name: {
          type: String,
          default: '',
          trim: true
        },
        role: {
          type: String,
          default: '',
          trim: true
        },
        sourceUrl: {
          type: String,
          default: '',
          trim: true
        },
        discoveryMethod: {
          type: String,
          enum: ['website_crawl', 'search_fallback', 'manual'],
          default: 'website_crawl'
        },
        confidenceScore: {
          type: Number,
          default: 80,
          min: 0,
          max: 100
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'verified', 'invalid', 'deliverable', 'extracted', 'manually_added'],
          default: 'extracted'
        },
        discoveredAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    contactStatus: {
      type: String,
      enum: ['not_searched', 'searching', 'found', 'not_found', 'failed'],
      default: 'not_searched',
      index: true
    },
    discoveredCampaigns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
      }
    ],
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

// Pre-save hook to ensure prospectDomain is always clean and contactEmail consistency
prospectSchema.pre('save', function (next) {
  if (this.prospectDomain) {
    this.prospectDomain = normalizeDomain(this.prospectDomain);
  } else if (this.prospectUrl) {
    this.prospectDomain = normalizeDomain(this.prospectUrl);
  }

  // Ensure contactEmail and contactEmails remain in sync
  if (Array.isArray(this.contactEmails) && this.contactEmails.length > 0) {
    if (!this.contactEmail) {
      this.contactEmail = this.contactEmails[0].email;
    }
    if (this.contactStatus === 'not_searched') {
      this.contactStatus = 'found';
    }
  } else if (this.contactEmail && (!this.contactEmails || this.contactEmails.length === 0)) {
    this.contactEmails = [
      {
        email: this.contactEmail,
        discoveryMethod: 'manual',
        confidenceScore: 85,
        verificationStatus: 'unverified',
        discoveredAt: new Date()
      }
    ];
    if (this.contactStatus === 'not_searched') {
      this.contactStatus = 'found';
    }
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
prospectSchema.index({ websiteId: 1, contactStatus: 1 });
prospectSchema.index({ websiteId: 1, contactEmail: 1 });

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
    qualificationStatus: this.qualificationStatus || 'unassessed',
    notes: this.notes,
    tags: this.tags || [],
    contactEmail: this.contactEmail || '',
    contactEmails: (this.contactEmails || []).map((c) => ({
      email: c.email,
      name: c.name || '',
      role: c.role || '',
      sourceUrl: c.sourceUrl || '',
      discoveryMethod: c.discoveryMethod || 'website_crawl',
      confidenceScore: c.confidenceScore ?? 80,
      verificationStatus: c.verificationStatus || 'unverified',
      discoveredAt: c.discoveredAt
    })),
    contactStatus: this.contactStatus || 'not_searched',
    discoveredCampaigns: (this.discoveredCampaigns || []).map((id) => id.toString()),
    lastContactedAt: this.lastContactedAt,
    metrics: this.metrics || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Prospect = mongoose.models.Prospect || mongoose.model('Prospect', prospectSchema);

export default Prospect;
