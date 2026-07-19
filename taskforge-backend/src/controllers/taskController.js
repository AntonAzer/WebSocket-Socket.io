const asyncHandler = require('express-async-handler');
const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { getNextPosition } = require('../utils/position');
const { boardRoom } = require('../socket');

/**
 * POST /api/v1/boards/:boardId/tasks
 * Card creation goes through REST (not a socket event) — it's a
 * once-in-a-while, form-driven action, unlike the high-frequency drag
 * gestures that justify a socket round trip. After persisting, we
 * broadcast `task:created` to the board room so every other open tab
 * picks it up without polling.
 */
const createTask = asyncHandler(async (req, res) => {
  const { title, listId, description = '', priority, dueDate } = req.body;

  if (!title || !title.trim()) throw new ApiError(400, 'Task title is required');
  if (!listId) throw new ApiError(400, 'listId is required');

  const list = await List.findOne({ _id: listId, board: req.board._id, isArchived: false });
  if (!list) throw new ApiError(404, 'List not found on this board');

  const lastTask = await Task.findOne({ list: listId, isArchived: false }).sort('-position');

  const task = await Task.create({
    title: title.trim(),
    description,
    priority,
    dueDate,
    board: req.board._id,
    list: listId,
    position: getNextPosition(lastTask?.position),
    createdBy: req.user._id,
  });

  await task.populate('assignees', 'name email avatar');
  await task.populate('createdBy', 'name email avatar');

  req.app.get('io')?.to(boardRoom(req.board._id)).emit('task:created', { task, listId });

  res.status(201).json({ success: true, task });
});

/**
 * PATCH /api/v1/tasks/:id
 * Edits to title/description/assignees/etc. — NOT position/list, that's
 * exclusively the socket `task:move` path so there's one code path
 * owning drag-and-drop state.
 */
const updateTask = asyncHandler(async (req, res) => {
  const { title, description, priority, dueDate, assignees, labels } = req.body;

  if (title !== undefined) req.task.title = title.trim();
  if (description !== undefined) req.task.description = description;
  if (priority !== undefined) req.task.priority = priority;
  if (dueDate !== undefined) req.task.dueDate = dueDate;
  if (assignees !== undefined) req.task.assignees = assignees;
  if (labels !== undefined) req.task.labels = labels;

  await req.task.save();
  await req.task.populate('assignees', 'name email avatar');
  await req.task.populate('createdBy', 'name email avatar');

  req.app.get('io')?.to(boardRoom(req.board._id)).emit('task:updated', { task: req.task });

  res.status(200).json({ success: true, task: req.task });
});

/** DELETE /api/v1/tasks/:id */
const deleteTask = asyncHandler(async (req, res) => {
  req.task.isArchived = true;
  await req.task.save();

  req.app
    .get('io')
    ?.to(boardRoom(req.board._id))
    .emit('task:deleted', { taskId: req.task._id.toString(), listId: req.task.list.toString() });

  res.status(200).json({ success: true, message: 'Task deleted' });
});

module.exports = { createTask, updateTask, deleteTask };
