const express = require('express');
const { protect } = require('../middleware/auth');
const { checkTaskAccess } = require('../middleware/resourceAuth');
const { updateTask, deleteTask } = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

router.patch('/:id', checkTaskAccess, updateTask);
router.delete('/:id', checkTaskAccess, deleteTask);

module.exports = router;
