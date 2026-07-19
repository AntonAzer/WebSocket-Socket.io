const mongoose = require('mongoose');

/**
 * A List is a column on a Board (e.g. "To Do", "In Progress", "Done").
 * `position` uses fractional indexing (a float) so a drag-and-drop reorder
 * only ever needs to update the ONE moved document — the new position is
 * the average of its new neighbours' positions — instead of re-indexing
 * every sibling on every move.
 */
const listSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'List title is required'],
      trim: true,
      maxlength: [100, 'List title cannot exceed 100 characters'],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

listSchema.index({ board: 1, position: 1 });

module.exports = mongoose.model('List', listSchema);
