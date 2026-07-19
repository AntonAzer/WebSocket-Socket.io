const mongoose = require('mongoose');

/**
 * A Workspace is the top-level container (think: an Asana "Organization" or
 * a Trello "Workspace"). It owns Boards, and has members with roles that
 * downstream authorization middleware can check against.
 */
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
  },
  { _id: false, timestamps: { createdAt: 'joinedAt', updatedAt: false } }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'A workspace must have at least one member',
      },
    },
  },
  { timestamps: true }
);

// Fast lookup of "all workspaces this user belongs to".
workspaceSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
