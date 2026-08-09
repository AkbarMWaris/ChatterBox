# Chatterbox - Real-time Chat Application

A real-time chat app built with **React** (frontend) and **Node.js + Express + Socket.io** (backend).
Messages are delivered instantly over WebSockets, and history survives page refreshes and server restarts.

![Stack](https://img.shields.io/badge/frontend-React%2018-61dafb)
![Stack](https://img.shields.io/badge/backend-Express%20%2B%20Socket.io-000000)

## Features

- Instant messaging with Socket.io (no polling, no page refresh)
- Chat history shown on load / refresh (stored in MongoDB, survives restarts)
- Message timestamps with "Today / Yesterday" day dividers
- Username login (dummy auth, persisted in localStorage)
- Typing indicator with a safety timeout
- Group info: every member who ever joined (online/offline, last seen)
- Online/offline presence list with dots
- Read / delivered receipts (double tick = delivered, blue double tick = read by everyone)
- Join/leave system notices
- Connection status banner + graceful error handling
- Responsive layout (sidebar hides on small screens)

## Project Structure

```
message app/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/messages.js         # REST calls (GET/POST /api/messages)
│   │   ├── components/             # Login, ChatRoom, Sidebar, MessageList, ...
│   │   ├── hooks/useChat.js        # all Socket.io client wiring
│   │   ├── utils/formatTime.js     # timestamp + day label helpers
│   │   └── styles/global.css       # plain hand-written CSS
│   └── vite.config.js
└── server/                     # Express + Socket.io backend
    ├── index.js                    # app entry, DB connect, middleware wiring
    ├── socket.js                   # Socket.io event handlers
    ├── config/db.js                # mongoose connection
    ├── models/Message.js           # message schema (MongoDB)
    ├── models/User.js              # member registry schema (MongoDB)
    ├── routes/messages.js          # REST routes
    ├── controllers/                # request handlers
    ├── services/                   # business logic (messageService)
    ├── store/                      # persistence layer (messageStore, userStore)
    ├── utils/color.js              # deterministic avatar color per name
    └── middleware/errorHandler.js  # 404 + 500 handling
```

## Prerequisites

- Node.js 18+ (tested on v22)
- npm
- MongoDB running locally (tested on 8.0) or an Atlas cluster connection string

## Setup

```bash
# clone / enter the project
cd message\ app

# backend
cd server
npm install
copy .env.example .env        # (Windows) - optional, defaults work out of the box

# frontend
cd ..\client
npm install
copy .env.example .env        # optional, defaults point at localhost:5000
```

## Running the app

**1. Start the backend (port 5000)**

```bash
cd server
npm run dev        # nodemon, restarts on file changes
# or
npm start          # plain node
```

You should see: `Chat server listening on http://localhost:5000`

**2. Start the frontend (port 3000)**

```bash
cd client
npm run dev
```

Open **http://localhost:3000**, enter a name, and join. Open a second tab in an incognito
window with a different name to watch the real-time magic (typing indicator, online list,
read ticks).

## Environment Variables

### server/.env

| Variable     | Default                            | Description                                        |
| ------------ | ---------------------------------- | -------------------------------------------------- |
| `PORT`       | `5000`                             | Port the API + Socket.io server listens on         |
| `CLIENT_URL` | `http://localhost:3000`            | Allowed CORS / socket origin                       |
| `MONGODB_URI`| `mongodb://127.0.0.1:27017/chatterbox` | MongoDB connection string (local or Atlas)     |

### client/.env

| Variable          | Default                     | Description                    |
| ----------------- | --------------------------- | ------------------------------ |
| `VITE_API_URL`    | `http://localhost:5000/api` | Base URL for REST calls       |
| `VITE_SOCKET_URL` | `http://localhost:5000`     | Socket.io server URL          |

## REST API

| Method | Endpoint          | Body                                       | Description                      |
| ------ | ----------------- | ------------------------------------------ | -------------------------------- |
| GET    | `/api/health`     | -                                          | Liveness check                   |
| GET    | `/api/messages`   | - (optional `?limit=` query, default 50)  | Fetch chat history               |
| POST   | `/api/messages`   | `{ "text": "...", "user": { "name": "..." } }` | Send a message (broadcasts over Socket.io) |

Error responses are always `{ "success": false, "message": "..." }` with an appropriate status code.

## Socket.io Events

| Event             | Direction | Payload                                              | Purpose                          |
| ----------------- | --------- | ---------------------------------------------------- | -------------------------------- |
| `user:join`       | client -> | `{ name }`                                           | Register the user               |
| `user:joined`     | -> client | `{ name, color }`                                    | Server-assigned avatar color    |
| `chat:history`    | -> client | `Message[]`                                          | History on join (after refresh) |
| `message:send`    | client -> | `{ text }`                                           | Send a message                  |
| `message:new`     | -> client | `Message`                                            | New message (realtime)          |
| `typing`          | both      | `{ user, isTyping }`                                 | Typing indicator                |
| `message:read`    | both      | `{ messageId }` / `Message`                          | Read receipt                    |
| `members:update`  | -> client | `[{ name, color, online, lastSeen }]`                | Full member list (all joiners)  |
| `system:notice`   | -> client | `{ text, type: 'join' \| 'leave' }`                  | Join/leave notices              |
| `message:error`   | -> client | `{ message }`                                        | Socket-level validation errors  |

A message looks like:

```json
{
  "id": "7c2a...",
  "text": "hello everyone",
  "user": { "name": "Priya", "color": "#8b5cf6" },
  "createdAt": "2026-08-09T10:15:30.123Z",
  "readBy": ["Ravi"],
  "status": "read"
}
```

## Design Decisions

- **Socket.io is the only realtime channel.** REST is used for history fetch and as an
  alternative send path; every stored message is broadcast through `io.emit('message:new')`,
  so clients never poll.
- **MongoDB as the store.** Messages live in a `chatterbox` database (collection `messages`)
  via mongoose. `server/store/messageStore.js` is the only file that talks to the database,
  and it exposes the same synchronous-looking API to the service layer, so the rest of the
  app stays storage-agnostic. Only the newest 100 messages are kept - older ones are pruned.
- **Persistent member registry.** A `users` collection remembers everyone who has ever
  joined, so group info can list members who are offline. Presence (online/offline) comes
  from the live socket map, not the DB, so it can never go stale after a crash.
- **Messages are broadcast to the whole room** - it is a single shared chat room, so
  presence and read state are room-wide, not per-conversation.
- **Read = seen by every other member.** Clients emit `message:read` for messages that
  arrive on an open screen (including on refresh). A message shows a blue double tick only
  once every other registered member has read it; a gray double tick means delivered.
- **Avatar color is derived from the name** (hash of the name against a fixed palette),
  so a user keeps the same color across sessions without any storage.
- **Typing indicator has a 3s client-side safety timer** so a missed "typing: false" can
  never leave a ghost "X is typing" on screen.
- **Server assigns user colors and validates/trims/slices messages** in one place
  (`socket.js` + `messageService.js`) so REST and socket paths behave identically.
- **Plain CSS, no UI framework.** Small enough to keep hand-written; class names follow
  BEM-ish conventions and the whole sheet lives in one file for easy tweaking.

## Assumptions

- Single shared chat room (no private conversations/channels).
- Dummy authentication: any name up to 20 characters; the name is stored in
  `localStorage`, no passwords or sessions (real auth would need a User model +
  token handling).
- The store keeps the most recent 100 messages.
- Each message stores a plain-text `user: { name, color }` snapshot so history still
  renders correctly even if that user is long gone.
- Messages are truncated to 1000 characters on the server.

## Known Limitations

- Messages are validated/trimmed server-side but there is no image/file upload support.
- If two users pick the same name, they merge into one member record and read receipts
  treat them as one person (duplicate names are allowed).
- A message only turns blue when every other member has read it - in a room where a
  member never returns, older messages keep the gray double tick.
- The `.env` files are optional - the app runs on sensible defaults.
