import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Website must belong to a user'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Website name is required'],
      trim: true,
      minlength: [2, 'Website name must be at least 2 characters'],
      maxlength: [100, 'Website name cannot exceed 100 characters']
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      trim: true,
      lowercase: true
    },
    url: {
      type: String,
      required: [true, 'Website URL is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true
    },
    verificationMethod: {
      type: String,
      default: 'DNS TXT'
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure a user cannot add the exact same domain twice
websiteSchema.index({ userId: 1, domain: 1 }, { unique: true });

// Convert to safe public representation
websiteSchema.methods.toSafeObject = function (includeToken = false) {
  const obj = {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    name: this.name,
    domain: this.domain,
    url: this.url,
    description: this.description,
    verificationStatus: this.verificationStatus,
    verificationMethod: this.verificationMethod,
    verifiedAt: this.verifiedAt,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (includeToken) {
    obj.verificationToken = this.verificationToken;
    obj.dnsRecord = {
      type: 'TXT',
      host: `_linkora-verification.${this.domain}`,
      value: `linkora-verification=${this.verificationToken}`
    };
  }

  return obj;
};

const Website = mongoose.models.Website || mongoose.model('Website', websiteSchema);

export default Website;
