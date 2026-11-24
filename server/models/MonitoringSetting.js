import mongoose from 'mongoose';

/**
 * MonitoringSetting Model
 * Stores backlink monitoring configuration and scheduling parameters for each website.
 */
const monitoringSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Monitoring settings must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Monitoring settings must belong to a website'],
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly'
    },
    lastScanAt: {
      type: Date,
      default: null
    },
    nextScanAt: {
      type: Date,
      default: null,
      index: true
    },
    isScanning: {
      type: Boolean,
      default: false
    },
    lastManualScanAt: {
      type: Date,
      default: null
    },
    emailAlerts: {
      type: Boolean,
      default: false
    },
    alertOnNew: {
      type: Boolean,
      default: true
    },
    alertOnLost: {
      type: Boolean,
      default: true
    },
    alertOnChanged: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for scheduler worker query
monitoringSettingSchema.index({ enabled: 1, nextScanAt: 1, isScanning: 1 });

monitoringSettingSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId.toString(),
    enabled: this.enabled,
    frequency: this.frequency,
    lastScanAt: this.lastScanAt,
    nextScanAt: this.nextScanAt,
    isScanning: this.isScanning,
    lastManualScanAt: this.lastManualScanAt,
    emailAlerts: this.emailAlerts,
    alertOnNew: this.alertOnNew,
    alertOnLost: this.alertOnLost,
    alertOnChanged: this.alertOnChanged,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const MonitoringSetting =
  mongoose.models.MonitoringSetting || mongoose.model('MonitoringSetting', monitoringSettingSchema);

export default MonitoringSetting;
