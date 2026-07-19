const asyncHandler = require('express-async-handler');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { slugify } = require('../utils/slugify');

/** POST /api/v1/workspaces */
const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Workspace name is required');
  }

  const workspace = await Workspace.create({
    name: name.trim(),
    description,
    slug: slugify(name),
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  res.status(201).json({ success: true, workspace });
});

/** GET /api/v1/workspaces — all workspaces the current user belongs to */
const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({ 'members.user': req.user._id })
    .sort('-createdAt')
    .populate('members.user', 'name email avatar');

  res.status(200).json({ success: true, workspaces });
});

/** GET /api/v1/workspaces/:workspaceId */
const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await req.workspace.populate('members.user', 'name email avatar');
  res.status(200).json({ success: true, workspace });
});

/** PATCH /api/v1/workspaces/:workspaceId */
const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (name !== undefined) req.workspace.name = name.trim();
  if (description !== undefined) req.workspace.description = description;
  await req.workspace.save();
  res.status(200).json({ success: true, workspace: req.workspace });
});

/** DELETE /api/v1/workspaces/:workspaceId — owner only */
const deleteWorkspace = asyncHandler(async (req, res) => {
  if (req.membershipRole !== 'owner') {
    throw new ApiError(403, 'Only the workspace owner can delete it');
  }
  await req.workspace.deleteOne();
  res.status(200).json({ success: true, message: 'Workspace deleted' });
});

/** POST /api/v1/workspaces/:workspaceId/members — { email, role } */
const inviteMember = asyncHandler(async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');
  if (!['admin', 'member'].includes(role)) throw new ApiError(400, 'Invalid role');

  const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
  if (!userToInvite) {
    throw new ApiError(404, 'No user found with that email — they need a TaskForge account first');
  }

  const alreadyMember = req.workspace.members.some((m) => m.user.toString() === userToInvite._id.toString());
  if (alreadyMember) {
    throw new ApiError(409, 'This user is already a member of the workspace');
  }

  req.workspace.members.push({ user: userToInvite._id, role });
  await req.workspace.save();
  await req.workspace.populate('members.user', 'name email avatar');

  res.status(200).json({ success: true, workspace: req.workspace });
});

/** DELETE /api/v1/workspaces/:workspaceId/members/:userId */
const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const target = req.workspace.members.find((m) => m.user.toString() === userId);

  if (!target) throw new ApiError(404, 'That user is not a member of this workspace');
  if (target.role === 'owner') throw new ApiError(400, 'The workspace owner cannot be removed');

  req.workspace.members = req.workspace.members.filter((m) => m.user.toString() !== userId);
  await req.workspace.save();

  res.status(200).json({ success: true, workspace: req.workspace });
});

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
};
