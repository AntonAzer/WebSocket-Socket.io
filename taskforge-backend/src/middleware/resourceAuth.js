const asyncHandler = require('express-async-handler');
const Workspace = require('../models/Workspace');
const Board = require('../models/Board');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');

/**
 * Loads the workspace named by `:workspaceId` and verifies req.user is a
 * member. Attaches `req.workspace` and `req.membershipRole` for downstream
 * handlers, so controllers never have to re-check membership themselves.
 */
const checkWorkspaceMember = asyncHandler(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  const membership = workspace.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!membership) {
    throw new ApiError(403, 'You are not a member of this workspace');
  }

  req.workspace = workspace;
  req.membershipRole = membership.role;
  next();
});

/**
 * Loads the board named by `:boardId`, then walks up to its workspace to
 * verify membership (board access is derived from workspace membership,
 * there's no separate board-level ACL in this schema). Attaches
 * `req.board`, `req.workspace`, and `req.membershipRole`.
 */
const checkBoardMember = asyncHandler(async (req, res, next) => {
  const board = await Board.findById(req.params.boardId);
  if (!board || board.isArchived) {
    throw new ApiError(404, 'Board not found');
  }

  const workspace = await Workspace.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, 'Parent workspace not found');
  }

  const membership = workspace.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!membership) {
    throw new ApiError(403, 'You do not have access to this board');
  }

  req.board = board;
  req.workspace = workspace;
  req.membershipRole = membership.role;
  next();
});

/**
 * Loads the task named by `:id`, then its board, then its workspace, to
 * verify membership before allowing a task update/delete. Attaches
 * `req.task`, `req.board`, `req.workspace`.
 */
const checkTaskAccess = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task || task.isArchived) {
    throw new ApiError(404, 'Task not found');
  }

  const board = await Board.findById(task.board);
  if (!board) {
    throw new ApiError(404, 'Parent board not found');
  }

  const workspace = await Workspace.findById(board.workspace);
  const membership = workspace?.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!membership) {
    throw new ApiError(403, 'You do not have access to this task');
  }

  req.task = task;
  req.board = board;
  req.workspace = workspace;
  req.membershipRole = membership.role;
  next();
});

/** Role-gate for workspace-scoped routes, e.g. only owner/admin can invite. */
const requireWorkspaceRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.membershipRole)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = { checkWorkspaceMember, checkBoardMember, checkTaskAccess, requireWorkspaceRole };
