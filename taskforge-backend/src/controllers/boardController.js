const asyncHandler = require('express-async-handler');
const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { GAP } = require('../utils/position');

const DEFAULT_LISTS = ['To Do', 'In Progress', 'Done'];

/** POST /api/v1/workspaces/:workspaceId/boards */
const createBoard = asyncHandler(async (req, res) => {
  const { title, description = '', background } = req.body;
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Board title is required');
  }

  const board = await Board.create({
    title: title.trim(),
    description,
    background,
    workspace: req.workspace._id,
    members: [req.user._id],
    createdBy: req.user._id,
  });

  // Every new board ships with the three standard columns, at spaced-out
  // positions (1024, 2048, 3072) so future lists can be inserted between
  // them without renumbering anything.
  const lists = await List.insertMany(
    DEFAULT_LISTS.map((listTitle, index) => ({
      title: listTitle,
      board: board._id,
      position: (index + 1) * GAP,
    }))
  );

  res.status(201).json({ success: true, board, lists: lists.map((l) => ({ ...l.toObject(), tasks: [] })) });
});

/** GET /api/v1/workspaces/:workspaceId/boards */
const getBoards = asyncHandler(async (req, res) => {
  const boards = await Board.find({ workspace: req.workspace._id, isArchived: false }).sort('-createdAt');
  res.status(200).json({ success: true, boards });
});

/**
 * GET /api/v1/boards/:boardId
 * Returns the board plus its lists, each with its tasks nested — exactly
 * the shape the Kanban UI renders from in one request.
 */
const getBoard = asyncHandler(async (req, res) => {
  const [lists, tasks] = await Promise.all([
    List.find({ board: req.board._id, isArchived: false }).sort('position'),
    Task.find({ board: req.board._id, isArchived: false })
      .sort('position')
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar'),
  ]);

  const tasksByList = tasks.reduce((acc, task) => {
    const key = task.list.toString();
    (acc[key] ||= []).push(task);
    return acc;
  }, {});

  const listsWithTasks = lists.map((list) => ({
    ...list.toObject(),
    tasks: tasksByList[list._id.toString()] || [],
  }));

  res.status(200).json({ success: true, board: req.board, lists: listsWithTasks });
});

/** PATCH /api/v1/boards/:boardId */
const updateBoard = asyncHandler(async (req, res) => {
  const { title, description, background } = req.body;
  if (title !== undefined) req.board.title = title.trim();
  if (description !== undefined) req.board.description = description;
  if (background !== undefined) req.board.background = background;
  await req.board.save();
  res.status(200).json({ success: true, board: req.board });
});

/** DELETE /api/v1/boards/:boardId — soft delete (archive) */
const deleteBoard = asyncHandler(async (req, res) => {
  req.board.isArchived = true;
  await req.board.save();
  res.status(200).json({ success: true, message: 'Board archived' });
});

module.exports = { createBoard, getBoards, getBoard, updateBoard, deleteBoard };
