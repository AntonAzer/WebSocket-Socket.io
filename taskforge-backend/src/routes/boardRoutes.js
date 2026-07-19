const express = require('express');
const { protect } = require('../middleware/auth');
const { checkBoardMember } = require('../middleware/resourceAuth');
const { getBoard, updateBoard, deleteBoard } = require('../controllers/boardController');
const { createTask } = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

router.get('/:boardId', checkBoardMember, getBoard);
router.patch('/:boardId', checkBoardMember, updateBoard);
router.delete('/:boardId', checkBoardMember, deleteBoard);

// Task creation is nested under its board because a new task always
// needs board-membership context; updates/deletes of an existing task
// derive that same context from the task itself (see taskRoutes.js).
router.post('/:boardId/tasks', checkBoardMember, createTask);

module.exports = router;
