# Chatterbox - Real-time Chat Application

A real-time chat app built with **React** (frontend) and **Node.js + Express + Socket.io** (backend).
Messages are delivered instantly over WebSockets, and history survives page refreshes and server restarts.

![Stack](https://img.shields.io/badge/frontend-React%2018-61dafb)
![Stack](https://img.shields.io/badge/backend-Express%20%2B%20Socket.io-000000)

## Features

- Instant messaging with Socket.io (no polling, no page refresh)
- **Private 1-on-1 chats** with any group member, separated from the group chat
- Chat history shown on load / refresh (stored in MongoDB, survives restarts)
- Message timestamps with "Today / Yesterday" day dividers
- Username login (dummy auth, persisted in localStorage)
- Typing indicator with a safety timeout (works per conversation)
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
    ├── utils/room.js               # room naming for group/private chats
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
| `CLIENT_URL` | `http://localhost:3000`            | Allowed CORS / socket origin(s). Comma-separated list or `*` (e.g. `https://chatterbox-nneww.vercel.app`) |
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
| GET    | `/api/messages`   | - (optional `?room=` and `?limit=`, default room `group`, default limit 50) | Fetch chat history for a room |
| POST   | `/api/messages`   | `{ "text": "...", "user": { "name": "..." }, "to": "Alice" }` | Send a message (`to` = recipient for a private chat, omit for the group) |
| POST   | `/api/upload`     | multipart form field `file` (image or video) | Upload a file to GridFS; returns `{ id, url, type, name, size, mime }` |
| GET    | `/api/files/:id`  | -                                          | Stream a stored file (supports `Range` requests for video seeking) |

Error responses are always `{ "success": false, "message": "..." }` with an appropriate status code.

## Socket.io Events

| Event             | Direction | Payload                                              | Purpose                          |
| ----------------- | --------- | ---------------------------------------------------- | -------------------------------- |
| `user:join`       | client -> | `{ name }`                                           | Register the user               |
| `user:joined`     | -> client | `{ name, color }`                                    | Server-assigned avatar color    |
| `message:send`    | client -> | `{ text, to?, file? }`                               | Send a message (`to` = DM target, `file` = attachment metadata from `/api/upload`) |
| `message:new`     | -> client | `Message`                                            | New message (realtime, room-scoped) |
| `typing`          | both      | `{ user, isTyping, room }`                           | Typing indicator (per room)     |
| `message:read`    | both      | `{ messageId }` / `Message`                          | Read receipt                    |
| `members:update`  | -> client | `[{ name, color, online, lastSeen }]`                | Full member list (all joiners)  |
| `unread:update`   | -> client | `{ room: count, ... }`                              | Unread badge counts per room    |
| `system:notice`   | -> client | `{ text, type: 'join' \| 'leave' }`                  | Join/leave notices (group only) |
| `message:error`   | -> client | `{ message }`                                        | Socket-level validation errors  |

Messages carry a `room` field: `"group"` for the shared chat, or `"dm:Alice:Bob"`
(sorted names) for private chats. DM messages and DM typing are only delivered to the
two participants' sockets.

A message looks like:

```json
{
  "id": "7c2a...",
  "room": "group",
  "text": "hello everyone",
  "type": "text",
  "file": null,
  "user": { "name": "Priya", "color": "#8b5cf6" },
  "createdAt": "2026-08-09T10:15:30.123Z",
  "readBy": ["Ravi"],
  "status": "delivered"
}
```

For media messages `type` is `"image"` or `"video"` and `file` carries
`{ id, url, type, name, size, mime }`; `url` is an absolute URL pointing back at
`GET /api/files/:id` so it works from any deployed frontend. `text` may be empty
for media-only messages (and is validated: a message needs text and/or a file).

Rooms are `group` or `dm:<sorted member names>` (e.g. `dm:Alice:Ravi`).

## Design Decisions

- **Socket.io is the only realtime channel.** REST is used for history fetch and as an
  alternative send path; every stored message is broadcast through a room-scoped
  `message:new`, so clients never poll.
- **Unread badges are server-side.** Counts come from the message store (messages not
  written by you that your name is missing from `readBy`, grouped by room) and are
  seeded on `user:join`, so badges survive refreshes. Clients increment locally for
  messages arriving in other rooms and zero the room's badge when it is opened (opening
  marks everything as seen, which matches the server's count).
- **MongoDB as the store.** Messages live in a `chatterbox` database (collection `messages`)
  via mongoose. `server/store/messageStore.js` is the only file that talks to the database,
  and it exposes the same synchronous-looking API to the service layer, so the rest of the
  app stays storage-agnostic. Only the newest 100 messages are kept - older ones are pruned.
- **Uploads live in GridFS.** Images/videos are streamed into a GridFS bucket inside the
  same MongoDB database, so they survive server restarts and redeploys (unlike the local
  disk on Render's free tier). Files are served through `GET /api/files/:id` with `Range`
  support so `<video>` can seek. Uploads are capped at 10 MB (images) / 50 MB (videos)
  and only `image/*` and `video/*` mimetypes are accepted.
- **Persistent member registry.** A `users` collection remembers everyone who has ever
  joined, so group info can list members who are offline. Presence (online/offline) comes
  from the live socket map, not the DB, so it can never go stale after a crash.
- **Messages are broadcast to the whole room** - it is a single shared chat room, so
  presence and read state are room-wide, not per-conversation.
- **Two conversation types, one message model.** Private chats are rooms named
  `dm:<sorted names>`; group chat is the `group` room. DM events are delivered only to
  the two participants' sockets, group events to everyone.
- **Read = seen by every other participant.** Clients emit `message:read` for messages
  that arrive on an open screen (including on refresh). A message shows a blue double
  tick only once every other participant has read it (for DMs that is the single other
  person); a gray double tick means delivered.
- **Avatar color is derived from the name** (hash of the name against a fixed palette),
  so a user keeps the same color across sessions without any storage.
- **Typing indicator has a 3s client-side safety timer** so a missed "typing: false" can
  never leave a ghost "X is typing" on screen.
- **Server assigns user colors and validates/trims/slices messages** in one place
  (`socket.js` + `messageService.js`) so REST and socket paths behave identically.
- **Plain CSS, no UI framework.** Small enough to keep hand-written; class names follow
  BEM-ish conventions and the whole sheet lives in one file for easy tweaking.

## Assumptions

- Two conversation types: one shared `group` room plus private `dm:` rooms between
  any two members.
- Dummy authentication: any name up to 20 characters; the name is stored in
  `localStorage`, no passwords or sessions (real auth would need a User model +
  token handling).
- The store keeps the most recent 100 messages.
- Each message stores a plain-text `user: { name, color }` snapshot so history still
  renders correctly even if that user is long gone.
- Messages are truncated to 1000 characters on the server.

## Known Limitations

- Messages are validated/trimmed server-side; uploads are limited to `image/*` and
  `video/*` mimetypes (10 MB images, 50 MB videos).
- If two users pick the same name, they merge into one member record and read receipts
  treat them as one person (duplicate names are allowed).
- A message only turns blue when every other member has read it - in a room where a
  member never returns, older messages keep the gray double tick.
- The `.env` files are optional - the app runs on sensible defaults.
- Uploaded files are never deleted - old GridFS files stay in the database even after
  their messages are pruned.
