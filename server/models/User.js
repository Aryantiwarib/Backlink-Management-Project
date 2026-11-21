import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address']
    },
    password: {
      type: String,
      // Optional for Google-only accounts
      required: false,
      minlength: [6, 'Password must be at least 6 characters']
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined without violating unique constraint
      trim: true
    },
    avatar: {
      type: String,
      default: null,
      trim: true
    },
    providers: {
      type: [String],
      enum: ['local', 'google'],
      default: ['local']
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password against bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe DTO representation that excludes sensitive fields
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar || null,
    providers: this.providers || ['local'],
    hasPassword: !!this.password,
    role: this.role || 'user',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Strip password automatically whenever user document is transformed to JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.hasPassword = !!ret.password;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User;
