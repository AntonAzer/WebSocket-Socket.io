import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, LayoutGrid } from 'lucide-react';
import { boardApi, workspaceApi } from '@/api/workspace';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import CreateEntityDialog from '@/components/CreateEntityDialog';
import InviteMemberDialog from '@/components/InviteMemberDialog';

export default function WorkspaceBoards() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = () =>
    Promise.all([workspaceApi.get(workspaceId), boardApi.list(workspaceId)]).then(([ws, bds]) => {
      setWorkspace(ws);
      setBoards(bds);
    });

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [workspaceId]);

  const myRole = workspace?.members?.find((m) => m.user._id === user?._id)?.role;
  const canInvite = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold tracking-tight">
            {workspace?.name || 'Workspace'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {workspace?.members?.length > 0 && (
            <div className="flex -space-x-1.5">
              {workspace.members.slice(0, 5).map((m) => (
                <div
                  key={m.user._id}
                  title={`${m.user.name} — ${m.role}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-[11px] font-semibold text-primary"
                >
                  {m.user.name?.[0]?.toUpperCase()}
                </div>
              ))}
            </div>
          )}
          {canInvite && (
            <InviteMemberDialog
              onInvite={async ({ email, role }) => {
                await workspaceApi.inviteMember(workspaceId, { email, role });
                await load();
              }}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Boards</h2>
            <p className="text-sm text-muted-foreground">
              Every new board starts with To Do, In Progress, and Done.
            </p>
          </div>
          <CreateEntityDialog
            triggerLabel="New board"
            title="Create a board"
            description="You can rename or add lists once it's created."
            fieldLabel="Board title"
            placeholder="Q3 Website Redesign"
            onSubmit={async (title) => {
              await boardApi.create(workspaceId, { title });
              await load();
            }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : boards.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">No boards yet in this workspace.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link key={board._id} to={`/boards/${board._id}`}>
                <Card
                  className="flex h-28 flex-col justify-between p-4 transition-colors hover:border-primary/50"
                  style={{ borderTopColor: board.background, borderTopWidth: 3 }}
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="font-medium">{board.title}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
