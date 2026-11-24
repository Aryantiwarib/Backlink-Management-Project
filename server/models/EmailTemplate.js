import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Template must belong to a user'],
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      default: null,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [150, 'Template name cannot exceed 150 characters']
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
      maxlength: [300, 'Subject cannot exceed 300 characters']
    },
    body: {
      type: String,
      required: [true, 'Email body is required'],
      maxlength: [10000, 'Body cannot exceed 10000 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    tags: {
      type: [String],
      default: () => []
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
emailTemplateSchema.index({ userId: 1, name: 1 });
emailTemplateSchema.index({ userId: 1, createdAt: -1 });

emailTemplateSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    websiteId: this.websiteId ? this.websiteId.toString() : null,
    name: this.name,
    subject: this.subject,
    body: this.body,
    description: this.description,
    tags: this.tags,
    isDefault: this.isDefault,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const EmailTemplate =
  mongoose.models.EmailTemplate ||
  mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;
