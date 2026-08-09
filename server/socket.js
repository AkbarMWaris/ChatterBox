const { Server } = require('socket.io');

const messageService = require('./services/messageService');
const userStore = require('./store/userStore');
const { colorForName } = require('./utils/color');

// socket.id -> { name, color }
// presence lives here, in memory: the DB flag can go stale when a
// socket dies without a clean disconnect (browser killed, server restart)
const onlineUsers = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000'
    }
  });

  async function broadcastMembers() {
    const members = await userStore.getMembers();
    const present = new Set([...onlineUsers.values()].map((u) => u.name));
    io.emit('members:update', members.map((member) => ({ ...member, online: present.has(member.name) })));
  }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('user:join', async (payload) => {
      const name = payload?.name ? String(payload.name).trim().slice(0, 20) : 'Anonymous';
      const color = colorForName(name);

      socket.data.user = { name, color };
      onlineUsers.set(socket.id, { name, color });
      await userStore.setOnline({ name, color });

      io.emit('system:notice', { text: `${name} joined the chat`, type: 'join' });
      await broadcastMembers();

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

    socket.on('disconnect', async () => {
      const user = socket.data.user;
      if (user) {
        onlineUsers.delete(socket.id);
        await userStore.setOffline(user.name);
        await broadcastMembers();
        io.emit('system:notice', { text: `${user.name} left the chat`, type: 'leave' });
        console.log(`${user.name} disconnected`);
      }
    });
  });

  return io;
}

module.exports = { initSocket };
