const express = require('express');
const { protect } = require('../middleware/auth');
const { checkWorkspaceMember, requireWorkspaceRole } = require('../middleware/resourceAuth');
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
} = require('../controllers/workspaceController');
const { createBoard, getBoards } = require('../controllers/boardController');

const router = express.Router();

router.use(protect); // every workspace route requires an authenticated user

router.get('/', getWorkspaces);
router.post('/', createWorkspace);

router.get('/:workspaceId', checkWorkspaceMember, getWorkspace);
router.patch('/:workspaceId', checkWorkspaceMember, requireWorkspaceRole('owner', 'admin'), updateWorkspace);
router.delete('/:workspaceId', checkWorkspaceMember, deleteWorkspace); // ownership re-checked in controller

router.post('/:workspaceId/members', checkWorkspaceMember, requireWorkspaceRole('owner', 'admin'), inviteMember);
router.delete('/:workspaceId/members/:userId', checkWorkspaceMember, requireWorkspaceRole('owner', 'admin'), removeMember);

// Boards live under their workspace for listing/creation; direct board
// access (get/update/delete/tasks) is handled by boardRoutes.js instead,
// since a board is fetched by its own id once you're inside it.
router.get('/:workspaceId/boards', checkWorkspaceMember, getBoards);
router.post('/:workspaceId/boards', checkWorkspaceMember, createBoard);

module.exports = router;
