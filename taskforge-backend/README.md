# TaskForge — Backend (Step 1: Architecture, Models & Auth)

## Folder structure

```
taskforge-backend/
├── src/
│   ├── config/
│   │   └── db.js              # Mongoose connection
│   ├── models/
│   │   ├── User.js             # password hashing, hashed refresh-token sessions
│   │   ├── Workspace.js        # top-level container, member roles
│   │   ├── Board.js            # belongs to a Workspace
│   │   ├── List.js             # belongs to a Board, fractional `position`
│   │   └── Task.js             # belongs to a List, fractional `position`
│   ├── middleware/
│   │   ├── auth.js             # protect() / restrictTo() route guards
│   │   └── errorHandler.js     # centralized error normalization
│   ├── controllers/
│   │   └── authController.js   # signup / login / refresh / logout / me
│   ├── routes/
│   │   └── authRoutes.js
│   ├── utils/
│   │   ├── generateTokens.js   # JWT signing + refresh-token hashing
│   │   └── ApiError.js
│   └── server.js               # app entrypoint
├── .env.example
└── package.json
```

## Setup

```bash
cd taskforge-backend
npm install
cp .env.example .env   # then fill in real secrets
npm run dev
```

Generate strong secrets for `.env`, e.g.:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Auth design decisions (worth mentioning in an interview)

- **Access token**: short-lived (15 min) JWT, returned in the JSON body, kept
  in memory on the client, sent as `Authorization: Bearer <token>`. Never
  touches localStorage, so it isn't readable by an XSS payload.
- **Refresh token**: long-lived (7 day) JWT, sent ONLY via an `httpOnly`,
  `Secure` (in prod), `SameSite` cookie scoped to `/api/v1/auth`. JavaScript
  on the client can never read it.
- **Rotation + hashed storage**: the server never stores a raw refresh
  token — only a SHA-256 hash, per device, on the User document. Every
  `/refresh` call consumes the presented token and issues a new one
  (rotation). A token that doesn't match any stored hash is rejected
  outright, which also gives you replay-attack detection for free.
- **Multi-device sessions**: each login/signup pushes a new session entry,
  so a user can be logged in on a laptop and a phone independently, and
  `logout` only invalidates the current device.
- **Password security**: bcrypt with cost factor 12, field excluded from
  queries by default (`select: false`), and stripped again in `toJSON()`
  as defense in depth.
- **Generic auth errors**: login returns the same "Invalid email or
  password" message whether the email doesn't exist or the password is
  wrong, preventing user enumeration.

## Quick test

```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"supersecret1"}'
```

## Next steps

- **Step 2**: Workspace/Board/List/Task CRUD controllers + routes, with
  authorization middleware checking workspace/board membership.
- **Step 3**: Socket.io real-time layer (task move/reorder broadcast to
  board rooms).
- **Step 4**: React frontend with drag-and-drop (`@dnd-kit` or
  `react-beautiful-dnd` successor `@hello-pangea/dnd`).
