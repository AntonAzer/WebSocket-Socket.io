const mongoose = require('mongoose');

/**
 * A Board lives inside a Workspace and contains Lists (columns).
 * Board-level membership lets you invite people to a specific project
 * without giving them access to the whole workspace.
 */
const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
      trim: true,
      maxlength: [100, 'Board title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    background: {
      type: String, // hex color or image URL
      default: '#0079BF',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

boardSchema.index({ workspace: 1, isArchived: 1 });

module.exports = mongoose.model('Board', boardSchema);
