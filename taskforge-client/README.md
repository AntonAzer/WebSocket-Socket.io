# TaskForge — Frontend (Step 2: React Setup + Auth Pages)

## Stack

- **Vite** — dev server & build
- **Tailwind CSS** — utility styling, themed via CSS variables
- **shadcn/ui-style primitives** — `Button`, `Input`, `Label`, `Card` hand-rolled
  in `src/components/ui/` following the shadcn pattern (`cva` variants, `cn()`
  merge helper, Radix-less since these are simple form controls). A
  `components.json` is included so the real `shadcn` CLI (`npx shadcn@latest
  add dialog`) will drop new components straight into this structure if you
  add more later.
- **react-router-dom** — routing + `ProtectedRoute` guard
- **react-hook-form + zod** — form state and validation, schema mirrors the
  backend's rules so users see the same constraints before a round trip
- **axios** — API client with interceptors (see below)

## Setup

```bash
cd taskforge-client
npm install
cp .env.example .env   # point VITE_API_URL at your backend if not localhost:5000
npm run dev
```

Requires the backend from Step 1 running on `http://localhost:5000` (or
whatever you set `VITE_API_URL` to) with `CLIENT_URL=http://localhost:5173`
in its `.env`, so CORS allows the credentialed requests.

## Folder structure

```
src/
├── api/
│   ├── axios.js       # axios instance, token interceptor, refresh-on-401
│   └── auth.js         # thin wrapper: signup/login/refresh/logout/me
├── components/
│   ├── ui/              # Button, Input, Label, Card
│   └── AuthLayout.jsx    # shared split-screen shell for auth pages
├── context/
│   └── AuthContext.jsx   # session state, bootstrap-on-load, auth actions
├── routes/
│   └── ProtectedRoute.jsx
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Dashboard.jsx     # placeholder landing page, replaced in Step 3
├── App.jsx
└── main.jsx
```

## How the frontend connects to the Step 1 backend

**Access token — kept in memory, not storage.** `api/axios.js` holds the
access token in a plain module variable, not `localStorage`. That's what
backend Step 1 assumed: an access token that JS holds and attaches as
`Authorization: Bearer <token>`, and a refresh token the frontend never
touches directly because it lives in an httpOnly cookie.

**Every request carries credentials.** The axios instance is created with
`withCredentials: true`, so the browser automatically sends the
`refreshToken` cookie set by `/auth/login` and `/auth/signup` on every
request to the API's origin — no manual cookie handling needed.

**Silent refresh on page load.** Access tokens live only in memory, so a
full page refresh loses them. `AuthContext`'s mount effect immediately
calls `POST /auth/refresh` — the browser sends the httpOnly cookie, the
backend rotates it and returns a new access token, and the session is
restored without the user re-entering credentials. If that call fails
(cookie expired/missing), the user just lands on `/login`.

**Automatic retry on 401.** If any API call gets a 401 mid-session (access
token expired naturally, ~15 min), the response interceptor in
`api/axios.js` transparently calls `/auth/refresh`, retries the original
request with the new token, and the calling code never sees the failure.
Concurrent 401s are coalesced into a single refresh call via a pending-queue
so ten simultaneous requests don't trigger ten refresh attempts.

**Forced logout on real session expiry.** If the refresh call itself fails
(refresh token expired or was revoked), the interceptor dispatches a
`taskforge:session-expired` browser event, which `AuthContext` listens for
and uses to clear `user` — `ProtectedRoute` then redirects to `/login`.

## Validation

`Login.jsx` and `Register.jsx` use `zod` schemas resolved through
`@hookform/resolvers`. The register schema (min 8 chars, at least one
digit, matching confirm-password) intentionally mirrors the
`express-validator` rules on the backend's `/auth/signup` route — client
validation is for UX, the backend validation in Step 1 remains the actual
security boundary.

## Next steps

- **Step 3**: Workspace/Board/List views + Socket.io real-time layer
- **Step 4**: Drag-and-drop task/list reordering (`@hello-pangea/dnd`)
