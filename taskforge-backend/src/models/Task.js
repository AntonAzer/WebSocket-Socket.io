const mongoose = require('mongoose');

/**
 * A Task is a card inside a List. Like List.position, Task.position uses
 * fractional indexing scoped to (list) so reordering within or across
 * lists during drag-and-drop is an O(1) write.
 */
const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    labels: [
      {
        name: { type: String, trim: true },
        color: { type: String, trim: true, default: '#61bd4f' },
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [commentSchema],
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

// Board-wide queries (e.g. "all tasks for a board" for board load) and
// list-scoped ordering (drag-and-drop) are the two hottest query paths.
taskSchema.index({ board: 1, isArchived: 1 });
taskSchema.index({ list: 1, position: 1 });

module.exports = mongoose.model('Task', taskSchema);
