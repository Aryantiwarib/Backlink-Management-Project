import mongoose from 'mongoose';
import { encryptToken, decryptToken } from '../utils/crypto.js';

const connectedEmailAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for connected email account'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['gmail'],
      default: 'gmail',
      required: true
    },
    accessToken: {
      type: String,
      default: null,
      select: false // Exclude from default queries for security
    },
    refreshToken: {
      type: String,
      default: null,
      select: false // Exclude from default queries for security
    },
    tokenExpiry: {
      type: Date,
      default: null
    },
    scope: {
      type: [String],
      default: () => []
    },
    status: {
      type: String,
      enum: ['connected', 'expired', 'revoked', 'disconnected'],
      default: 'connected',
      index: true
    },
    lastSyncAt: {
      type: Date,
      default: null
    },
    metadata: {
      name: { type: String, default: '' },
      picture: { type: String, default: '' },
      gmailId: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: one active provider account per user
connectedEmailAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

// Pre-save hook: encrypt tokens before writing to MongoDB
connectedEmailAccountSchema.pre('save', function () {
  if (this.isModified('accessToken') && this.accessToken) {
    if (!this.accessToken.includes(':')) {
      this.accessToken = encryptToken(this.accessToken);
    }
  }
  if (this.isModified('refreshToken') && this.refreshToken) {
    if (!this.refreshToken.includes(':')) {
      this.refreshToken = encryptToken(this.refreshToken);
    }
  }
});

// Helper method to retrieve decrypted tokens securely
connectedEmailAccountSchema.methods.getDecryptedTokens = function () {
  return {
    accessToken: decryptToken(this.accessToken),
    refreshToken: decryptToken(this.refreshToken)
  };
};

// Safe public DTO (never exposes tokens)
connectedEmailAccountSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    email: this.email,
    provider: this.provider,
    status: this.status,
    hasRefreshToken: Boolean(this.refreshToken),
    tokenExpiry: this.tokenExpiry,
    lastSyncAt: this.lastSyncAt,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const ConnectedEmailAccount =
  mongoose.models.ConnectedEmailAccount ||
  mongoose.model('ConnectedEmailAccount', connectedEmailAccountSchema);

export default ConnectedEmailAccount;
