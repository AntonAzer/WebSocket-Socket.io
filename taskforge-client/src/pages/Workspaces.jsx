import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Loader2, Users } from 'lucide-react';
import { workspaceApi } from '@/api/workspace';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CreateEntityDialog from '@/components/CreateEntityDialog';

export default function Workspaces() {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => workspaceApi.list().then(setWorkspaces).finally(() => setIsLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">TaskForge</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Your workspaces</h1>
            <p className="text-sm text-muted-foreground">Pick a workspace to see its boards.</p>
          </div>
          <CreateEntityDialog
            triggerLabel="New workspace"
            title="Create a workspace"
            description="A workspace groups the boards for a team or project."
            fieldLabel="Workspace name"
            placeholder="Product Team"
            onSubmit={async (name) => {
              await workspaceApi.create({ name });
              await load();
            }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : workspaces.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No workspaces yet. Create one to start building boards.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link key={ws._id} to={`/workspaces/${ws._id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-base">{ws.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {ws.description || 'No description'}
                    </CardDescription>
                    <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {ws.members?.length ?? 1} member{ws.members?.length === 1 ? '' : 's'}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
