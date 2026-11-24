import mongoose from 'mongoose';
import { extractDomainFromUrl } from './Backlink.js';

/**
 * MonitoringEvent Model
 * Stores detected backlink events (new, lost, changed) and serves as the notification/alert entity.
 */
const monitoringEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Event must belong to a website'],
      index: true
    },
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonitoringScan',
      default: null,
      index: true
    },
    eventType: {
      type: String,
      enum: ['new_backlink', 'lost_backlink', 'backlink_changed'],
      required: [true, 'Event type is required'],
      index: true
    },
    sourceUrl: {
      type: String,
      required: [true, 'Source URL is required'],
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
      required: [true, 'Target URL is required'],
      trim: true
    },
    anchorText: {
      type: String,
      default: '',
      trim: true
    },
    linkType: {
      type: String,
      enum: ['dofollow', 'nofollow', 'unknown'],
      default: 'unknown'
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info'
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

// Pre-save hook to populate sourceDomain
monitoringEventSchema.pre('save', function (next) {
  if (!this.sourceDomain && this.sourceUrl) {
    this.sourceDomain = extractDomainFromUrl(this.sourceUrl);
  }
  if (typeof next === 'function') next();
});

// Indexes for querying events & alerts
monitoringEventSchema.index({ websiteId: 1, detectedAt: -1 });
monitoringEventSchema.index({ websiteId: 1, eventType: 1, detectedAt: -1 });
monitoringEventSchema.index({ userId: 1, isRead: 1, detectedAt: -1 });
monitoringEventSchema.index({ userId: 1, detectedAt: -1 });

monitoringEventSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    scanId: this.scanId ? this.scanId.toString() : null,
    eventType: this.eventType,
    sourceUrl: this.sourceUrl,
    sourceDomain: this.sourceDomain || extractDomainFromUrl(this.sourceUrl),
    targetUrl: this.targetUrl,
    anchorText: this.anchorText,
    linkType: this.linkType,
    previousValues: this.previousValues,
    newValues: this.newValues,
    detectedAt: this.detectedAt,
    isRead: this.isRead,
    severity: this.severity,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const MonitoringEvent =
  mongoose.models.MonitoringEvent || mongoose.model('MonitoringEvent', monitoringEventSchema);

export default MonitoringEvent;
