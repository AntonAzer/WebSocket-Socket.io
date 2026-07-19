const { Server } = require('socket.io');
const socketAuth = require('./socketAuth');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const List = require('../models/List');
const Task = require('../models/Task');

/** Every board gets its own room so events never leak across boards. */
const boardRoom = (boardId) => `board:${boardId}`;

/** Re-verifies workspace membership for a socket event — sockets are
 *  long-lived, so we can't trust a membership check that only ran once
 *  at connect time; a user could be removed from a workspace mid-session. */
const assertBoardAccess = async (userId, boardId) => {
  const board = await Board.findById(boardId);
  if (!board || board.isArchived) throw new Error('Board not found');

  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId.toString());
  if (!isMember) throw new Error('Not authorized for this board');

  return board;
};

function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.id})`);

    /**
     * A client joins a board's room the moment they open that board's
     * page, and leaves when they navigate away — this is what scopes
     * "real-time updates for other users on the same board" instead of
     * broadcasting every change to every connected client.
     */
    socket.on('board:join', async (boardId, callback) => {
      try {
        await assertBoardAccess(socket.user._id, boardId);
        socket.join(boardRoom(boardId));
        callback?.({ success: true });
      } catch (err) {
        callback?.({ success: false, message: err.message });
      }
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(boardRoom(boardId));
    });

    /**
     * The core real-time interaction: a card was dragged to a new spot.
     * Client sends where it landed, server persists it, then broadcasts
     * to everyone else in the room (the mover already applied it
     * optimistically, so we exclude them with `socket.to(...)` rather
     * than `io.to(...)`).
     *
     * Payload: { taskId, boardId, sourceListId, destListId, position }
     */
    socket.on('task:move', async (payload, callback) => {
      try {
        const { taskId, boardId, destListId, position } = payload;
        if (!taskId || !boardId || !destListId || typeof position !== 'number') {
          throw new Error('Invalid move payload');
        }

        await assertBoardAccess(socket.user._id, boardId);

        const destList = await List.findOne({ _id: destListId, board: boardId, isArchived: false });
        if (!destList) throw new Error('Destination list not found on this board');

        const task = await Task.findOneAndUpdate(
          { _id: taskId, board: boardId, isArchived: false },
          { list: destListId, position },
          { new: true }
        );
        if (!task) throw new Error('Task not found on this board');

        socket.to(boardRoom(boardId)).emit('task:moved', {
          taskId: task._id.toString(),
          sourceListId: payload.sourceListId,
          destListId,
          position,
          movedBy: { id: socket.user._id.toString(), name: socket.user.name },
        });

        callback?.({ success: true });
      } catch (err) {
        callback?.({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
    });
  });

  return io;
}

module.exports = { initializeSocket, boardRoom };
