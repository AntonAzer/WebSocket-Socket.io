const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Sub-document representing a single active refresh-token "session".
 * We never store the raw refresh token — only a SHA-256 hash of it — so a
 * DB leak does not hand out usable tokens. Storing one entry per device
 * lets a user be logged in on a laptop + phone and revoke sessions
 * individually (e.g. "log out of all devices").
 */
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    userAgent: { type: String, default: 'unknown' },
    ip: { type: String, default: 'unknown' },
    expiresAt: { type: Date, required: true },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default on find queries
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    sessions: {
      type: [sessionSchema],
      select: false, // internal auth data, never sent to the client by default
    },
  },
  { timestamps: true }
);

// Hash password only when it has been created/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip sensitive/internal fields whenever a user doc is serialized to JSON.
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.sessions;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
