# TaskForge — Full-Stack Project Management Platform (MERN)

A Trello/Asana-style tool: Workspaces → Boards → Lists → Tasks, with JWT auth
(access + rotating refresh tokens) and real-time drag-and-drop powered by
Socket.io.

## Prerequisites

- Node.js 18+
- A running MongoDB instance — either local (`mongod` on `27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. This sandbox
  couldn't spin up a live Mongo instance to test against (no network route
  to MongoDB's binary host), so **you'll want to run this against your own
  Mongo before considering it verified end-to-end** — see "What's been
  tested" below for exactly what has and hasn't been exercised.

## Running it locally

**Terminal 1 — backend**
```bash
cd taskforge-backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI to your Mongo instance, generate real secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm run dev
```
Backend runs on `http://localhost:5000`.

**Terminal 2 — frontend**
```bash
cd taskforge-client
npm install
cp .env.example .env   # defaults already point at localhost:5000
npm run dev
```
Frontend runs on `http://localhost:5173`.

## Manual test script

1. Open `http://localhost:5173` → redirected to `/login`.
2. Register a new account → redirected to `/dashboard` (Workspaces).
3. Create a workspace → click into it → create a board.
4. Board opens with three columns: **To Do / In Progress / Done**.
5. Add a card in "To Do", drag it into "In Progress" — position persists
   on refresh (confirms the REST `getBoard` + drag persistence work).
6. **Real-time check:** open the same board URL in a second browser
   (or an incognito window, logged in as a second registered user who's
   been invited to the workspace — see below). Drag a card in one window;
   it should move in the other window within a beat, no refresh needed.
   The "Live" badge in the header should read green once the socket
   connects.
7. To test multi-user: from window A, use the workspace's "invite member"
   flow (currently API-only — see `workspaceApi.inviteMember`, no UI button
   yet) or just register two accounts and manually add the second user's
   id via `POST /api/v1/workspaces/:id/members` with their email.
8. Refresh the page mid-session → should NOT bounce to `/login` (confirms
   the silent-refresh-on-load flow in `AuthContext`).
9. Wait 15+ minutes and perform an action → should still work without a
   visible interruption (confirms the axios 401 → refresh → retry
   interceptor); you can also shortcut this by temporarily setting
   `JWT_ACCESS_EXPIRES_IN=20s` in the backend `.env` to trigger it quickly.

## What's been tested in this environment vs. what to verify yourself

**Verified here:**
- Every backend file passes `node --check` (syntax) and loads without
  import errors.
- The position/slug helper functions are unit-tested inline (fractional
  indexing math, slug format).
- The full server boots, and I hit it live: `/api/v1/health` → 200,
  an unknown route → 404 via the error handler, `/api/v1/auth/me` without
  a token → 401 via `protect` middleware, and the Socket.io handshake
  endpoint responds correctly.
- The full frontend builds cleanly via `vite build` (1801 modules
  transformed, no errors) both before and after the Step 3 additions.

**Not verified here (needs your machine):** anything requiring a live
MongoDB connection — actual signup/login persistence, workspace/board/task
CRUD against real data, and the full drag-and-drop → socket → DB → other
client round trip. This sandbox has no network path to a Mongo server or
binary, so run through the manual test script above once you've got Mongo
connected — that's the real end-to-end confirmation.

## Architecture recap

```
taskforge-backend/          Express + Mongoose + Socket.io
├── src/models/              User, Workspace, Board, List, Task
├── src/controllers/         auth, workspace, board, task
├── src/middleware/          auth (JWT), resourceAuth (membership checks)
├── src/socket/              Socket.io auth + task:move real-time handler
└── src/utils/position.js    fractional indexing shared by drag-and-drop

taskforge-client/            React (Vite) + Tailwind + shadcn-style UI
├── src/api/                 axios instance (token refresh), REST wrappers
├── src/socket/               socket.io-client connection + board-room hook
├── src/context/AuthContext   session bootstrap, login/register/logout
├── src/pages/                Login, Register, Workspaces, WorkspaceBoards, Board
└── src/components/           Column, TaskCard, dialogs, shadcn ui/ primitives
```

### The real-time design, end to end

1. Card creation and edits go through **REST** — infrequent, form-driven
   actions. The controller persists to Mongo, then does
   `io.to(boardRoom).emit('task:created' | 'task:updated' | 'task:deleted', ...)`
   so every other open tab on that board updates without polling.
2. Card **movement** (drag-and-drop) is the one thing that goes through
   **Socket.io directly**, not REST — `task:move` is emitted the instant a
   drag ends, the server persists the new `list`/`position`, and broadcasts
   `task:moved` to everyone else in the room. The mover's own UI already
   updated optimistically, so the server excludes them (`socket.to`, not
   `io.to`) and rolls the optimistic change back only if the server
   rejects the move.
3. Both list and task ordering use **fractional indexing** (`position` as
   a float, new position = average of its neighbours) so a reorder is a
   single-document write regardless of how many cards are on the board —
   see `src/utils/position.js` (backend) and `src/lib/position.js`
   (frontend, same math, used for the optimistic update).
4. The **access token lives in memory only** and is passed to the socket
   handshake as `socket.handshake.auth.token`; if it's expired when the
   socket tries to connect, the client silently calls `/auth/refresh` and
   reconnects once, mirroring the REST 401-retry interceptor.


