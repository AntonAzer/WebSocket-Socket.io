import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, X } from 'lucide-react';
import TaskCard from './TaskCard';
import { Button } from './ui/button';

/**
 * One Kanban column ("To Do" / "In Progress" / "Done"). Owns its own
 * quick-add form state so opening "add task" on one column doesn't
 * re-render the others.
 */
export default function Column({ list, onAddTask, onTaskClick }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddTask(list._id, title.trim());
      setTitle('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-card/60 border border-border">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">{list.title}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {list.tasks.length}
        </span>
      </div>

      <Droppable droppableId={list._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[40px] flex-1 flex-col gap-2 px-3 pb-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5' : ''
            }`}
          >
            {list.tasks.map((task, index) => (
              <TaskCard key={task._id} task={task} index={index} onClick={onTaskClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="px-3 pb-3">
        {isAdding ? (
          <form onSubmit={submit} className="space-y-2">
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e);
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="w-full resize-none rounded-md border border-input bg-secondary/40 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Add card
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
