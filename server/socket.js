const { Server } = require('socket.io');

const messageService = require('./services/messageService');

// socket.id -> { name, color }
const onlineUsers = new Map();

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

// deterministic color per name so a user keeps the same avatar color
function colorForName(name) {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000'
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('user:join', async (payload) => {
      const name = payload?.name ? String(payload.name).trim().slice(0, 20) : 'Anonymous';
      const color = colorForName(name);

      socket.data.user = { name, color };
      onlineUsers.set(socket.id, { name, color });

      io.emit('users:online', [...onlineUsers.values()]);
      io.emit('system:notice', { text: `${name} joined the chat`, type: 'join' });

      // tell this socket who it is (server assigns the color)
      socket.emit('user:joined', { name, color });
      // send recent history so a refresh always shows previous messages
      try {
        const history = await messageService.getMessages(50);
        socket.emit('chat:history', history);
      } catch (err) {
        console.error('Could not load chat history:', err.message);
        socket.emit('message:error', { message: 'Could not load chat history' });
      }
    });

    socket.on('message:send', async (payload) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('message:error', { message: 'You must join before sending messages' });
        return;
      }

      const text = payload?.text ? String(payload.text).trim().slice(0, 1000) : '';
      if (!text) {
        socket.emit('message:error', { message: 'Message cannot be empty' });
        return;
      }

      try {
        const message = await messageService.addMessage({ text, user });
        io.emit('message:new', message);
      } catch (err) {
        console.error('Could not store message:', err.message);
        socket.emit('message:error', { message: 'Could not store your message, try again' });
      }
    });

    socket.on('typing', (isTyping) => {
      const user = socket.data.user;
      if (!user) return;
      socket.broadcast.emit('typing', { user: user.name, isTyping: Boolean(isTyping) });
    });

    socket.on('message:read', async ({ messageId }) => {
      const user = socket.data.user;
      if (!user || !messageId) return;

      try {
        const updated = await messageService.markRead(messageId, user.name);
        if (updated) {
          io.emit('message:read', updated);
        }
      } catch (err) {
        console.error('Could not update read status:', err.message);
      }
    });

    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (user) {
        onlineUsers.delete(socket.id);
        io.emit('users:online', [...onlineUsers.values()]);
        io.emit('system:notice', { text: `${user.name} left the chat`, type: 'leave' });
        console.log(`${user.name} disconnected`);
      }
    });
  });

  return io;
}

module.exports = { initSocket };
