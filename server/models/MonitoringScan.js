import mongoose from 'mongoose';

/**
 * MonitoringScan Model
 * Records each backlink monitoring scan execution, status, and differential metrics.
 */
const monitoringScanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scan must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Scan must belong to a website'],
      index: true
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      trim: true,
      lowercase: true
    },
    scanStartedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    scanCompletedAt: {
      type: Date,
      default: null
    },
    scanStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    triggerType: {
      type: String,
      enum: ['manual', 'scheduled'],
      default: 'manual'
    },
    provider: {
      type: String,
      default: 'moz',
      trim: true,
      lowercase: true
    },
    backlinksChecked: {
      type: Number,
      default: 0,
      min: 0
    },
    newBacklinksCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lostBacklinksCount: {
      type: Number,
      default: 0,
      min: 0
    },
    changedBacklinksCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isBaseline: {
      type: Boolean,
      default: false
    },
    errorMessage: {
      type: String,
      default: null
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

// Compound indexes for fast history queries
monitoringScanSchema.index({ websiteId: 1, scanStartedAt: -1 });
monitoringScanSchema.index({ userId: 1, scanStartedAt: -1 });
monitoringScanSchema.index({ websiteId: 1, scanStatus: 1 });

monitoringScanSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    domain: this.domain,
    scanStartedAt: this.scanStartedAt,
    scanCompletedAt: this.scanCompletedAt,
    scanStatus: this.scanStatus,
    triggerType: this.triggerType,
    provider: this.provider,
    backlinksChecked: this.backlinksChecked,
    newBacklinksCount: this.newBacklinksCount,
    lostBacklinksCount: this.lostBacklinksCount,
    changedBacklinksCount: this.changedBacklinksCount,
    isBaseline: this.isBaseline,
    errorMessage: this.errorMessage,
    durationMs:
      this.scanCompletedAt && this.scanStartedAt
        ? new Date(this.scanCompletedAt).getTime() - new Date(this.scanStartedAt).getTime()
        : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const MonitoringScan =
  mongoose.models.MonitoringScan || mongoose.model('MonitoringScan', monitoringScanSchema);

export default MonitoringScan;
