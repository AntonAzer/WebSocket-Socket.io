import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-primary/15 text-primary',
  high: 'bg-orange-500/15 text-orange-400',
  urgent: 'bg-destructive/15 text-destructive',
};

export default function TaskCard({ task, index, onClick }) {
  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(task)}
          className={cn(
            'group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
            snapshot.isDragging && 'rotate-1 shadow-lg ring-2 ring-primary/50'
          )}
        >
          <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>

          {(task.priority || task.dueDate || task.assignees?.length > 0) && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {task.priority && (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                      PRIORITY_STYLES[task.priority]
                    )}
                  >
                    {task.priority}
                  </span>
                )}
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {task.assignees?.length > 0 && (
                <div className="flex -space-x-1.5">
                  {task.assignees.slice(0, 3).map((a) => (
                    <div
                      key={a._id}
                      title={a.name}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-primary/20 text-[9px] font-semibold text-primary"
                    >
                      {a.name?.[0]?.toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
