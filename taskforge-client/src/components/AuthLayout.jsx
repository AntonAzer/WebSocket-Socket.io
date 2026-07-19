import React from 'react';
import { Flame } from 'lucide-react';

/**
 * Shared shell for Login/Register. Left panel carries the brand story;
 * right panel is a slot for the actual form. Kept as one component so
 * both pages stay visually identical and only the form content differs.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12 border-r border-border">
        <div className="pointer-events-none absolute inset-0 bg-forge-gradient" />

        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Flame className="h-5 w-5 text-primary animate-ember" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">TaskForge</span>
        </div>

        <div className="relative max-w-md space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/80">
            Workspace / Board / Task
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
            Shape the work before it shapes your week.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Workspaces, boards, and tasks that move in real time — every
            drag, drop, and status change lands instantly for the whole
            team, no refresh required.
          </p>
        </div>

        <p className="relative font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} TaskForge. Built for teams that ship.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
