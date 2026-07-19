import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { ArrowLeft, Loader2, Circle } from 'lucide-react';

import { boardApi, taskApi } from '@/api/workspace';
import { useBoardSocket, emitTaskMove } from '@/socket/useBoardSocket';
import getSocket from '@/socket/socket';
import { getPositionBetween } from '@/lib/position';
import Column from '@/components/Column';

/** Removes a task by id from wherever it currently lives across all lists. */
const removeTaskFromLists = (lists, taskId) =>
  lists.map((list) => ({ ...list, tasks: list.tasks.filter((t) => t._id !== taskId) }));

/** Inserts a task into its list, keeping tasks sorted by `position`. */
const insertTaskSorted = (lists, listId, task) =>
  lists.map((list) => {
    if (list._id !== listId) return list;
    const tasks = [...list.tasks, task].sort((a, b) => a.position - b.position);
    return { ...list, tasks };
  });

/**
 * Same as insertTaskSorted, but a no-op if the task is already present
 * anywhere on the board. A newly-created task can reach the client via
 * two independent channels — the REST response to the creator's own
 * POST, and the `task:created` socket broadcast (which includes the
 * creator, since they're in the board room too) — and those two
 * channels have no guaranteed ordering relative to each other. Without
 * this check, whichever one arrives second re-inserts the same task,
 * duplicating it only for the person who created it.
 */
const insertTaskIfAbsent = (lists, listId, task) => {
  const alreadyPresent = lists.some((l) => l.tasks.some((t) => t._id === task._id));
  return alreadyPresent ? lists : insertTaskSorted(lists, listId, task);
};

export default function Board() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSocketReady, setIsSocketReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    boardApi
      .get(boardId)
      .then(({ board, lists }) => {
        if (cancelled) return;
        setBoard(board);
        setLists(lists);
      })
      .catch(() => !cancelled && setError('Could not load this board.'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // --- Real-time sync: merge events from other clients into local state ---
  useBoardSocket(boardId, {
    onTaskCreated: useCallback(({ task, listId }) => {
      setLists((prev) => insertTaskIfAbsent(prev, listId, task));
    }, []),

    onTaskMoved: useCallback(({ taskId, destListId, position }) => {
      setLists((prev) => {
        const source = prev.flatMap((l) => l.tasks).find((t) => t._id === taskId);
        if (!source) return prev;
        const moved = { ...source, list: destListId, position };
        return insertTaskSorted(removeTaskFromLists(prev, taskId), destListId, moved);
      });
    }, []),

    onTaskUpdated: useCallback(({ task }) => {
      setLists((prev) =>
        prev.map((list) => ({
          ...list,
          tasks: list.tasks.map((t) => (t._id === task._id ? { ...t, ...task } : t)),
        }))
      );
    }, []),

    onTaskDeleted: useCallback(({ taskId }) => {
      setLists((prev) => removeTaskFromLists(prev, taskId));
    }, []),
  });

  useEffect(() => {
    const socket = getSocket();
    setIsSocketReady(socket.connected);
    const onConnect = () => setIsSocketReady(true);
    const onDisconnect = () => setIsSocketReady(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleAddTask = async (listId, title) => {
    const task = await taskApi.create(boardId, { title, listId });
    setLists((prev) => insertTaskIfAbsent(prev, listId, task));
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const snapshot = lists; // for rollback if the server rejects the move

    const sourceList = lists.find((l) => l._id === source.droppableId);
    const movedTask = sourceList.tasks.find((t) => t._id === draggableId);
    if (!movedTask) return;

    // Build the destination list's task order *after* the drop, so we can
    // read the moved card's new neighbours and compute its position.
    const withoutMoved = removeTaskFromLists(lists, draggableId);
    const destListAfter = withoutMoved.find((l) => l._id === destination.droppableId);
    const neighbours = [...destListAfter.tasks];
    neighbours.splice(destination.index, 0, movedTask);

    const prevTask = neighbours[destination.index - 1];
    const nextTask = neighbours[destination.index + 1];
    const position = getPositionBetween(prevTask?.position, nextTask?.position);

    const updatedTask = { ...movedTask, list: destination.droppableId, position };
    setLists(insertTaskSorted(withoutMoved, destination.droppableId, updatedTask));

    try {
      await emitTaskMove({
        taskId: draggableId,
        boardId,
        sourceListId: source.droppableId,
        destListId: destination.droppableId,
        position,
      });
    } catch (err) {
      console.error('[Board] Move rejected, rolling back:', err.message);
      setLists(snapshot);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/dashboard" className="text-sm text-primary hover:underline">
          Back to workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold tracking-tight">{board?.title}</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className={`h-2 w-2 ${isSocketReady ? 'fill-emerald-500 text-emerald-500' : 'fill-muted text-muted'}`} />
          {isSocketReady ? 'Live' : 'Connecting…'}
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {lists.map((list) => (
            <Column key={list._id} list={list} onAddTask={handleAddTask} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
