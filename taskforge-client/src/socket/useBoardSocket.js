import { useEffect, useRef } from 'react';
import getSocket, { connectSocket } from './socket';

/**
 * Joins the given board's Socket.io room for the lifetime of the
 * component and wires the four real-time events the Kanban board cares
 * about. Handlers are taken as a ref-stable object so callers can pass
 * inline arrow functions without this effect re-running on every render.
 *
 * @param {string} boardId
 * @param {{ onTaskCreated?: fn, onTaskMoved?: fn, onTaskUpdated?: fn, onTaskDeleted?: fn }} handlers
 */
export function useBoardSocket(boardId, handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // always call the latest closures

  useEffect(() => {
    if (!boardId) return undefined;

    const socket = connectSocket();

    const join = () => {
      socket.emit('board:join', boardId, (res) => {
        if (!res?.success) {
          console.error('[Socket] Failed to join board room:', res?.message);
        }
      });
    };

    if (socket.connected) join();
    socket.on('connect', join);

    const onTaskCreated = (payload) => handlersRef.current.onTaskCreated?.(payload);
    const onTaskMoved = (payload) => handlersRef.current.onTaskMoved?.(payload);
    const onTaskUpdated = (payload) => handlersRef.current.onTaskUpdated?.(payload);
    const onTaskDeleted = (payload) => handlersRef.current.onTaskDeleted?.(payload);

    socket.on('task:created', onTaskCreated);
    socket.on('task:moved', onTaskMoved);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('connect', join);
      socket.off('task:created', onTaskCreated);
      socket.off('task:moved', onTaskMoved);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
    };
  }, [boardId]);
}

/** Emits a drag-and-drop move. Returns a promise so callers can roll back
 *  the optimistic UI update if the server rejects it. */
export function emitTaskMove(payload) {
  return new Promise((resolve, reject) => {
    getSocket().emit('task:move', payload, (res) => {
      if (res?.success) resolve(res);
      else reject(new Error(res?.message || 'Failed to move task'));
    });
  });
}
