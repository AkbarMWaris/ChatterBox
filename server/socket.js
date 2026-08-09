const { Server } = require('socket.io');

const messageService = require('./services/messageService');
const messageStore = require('./store/messageStore');
const userStore = require('./store/userStore');
const { colorForName } = require('./utils/color');
const { dmRoom, isDmRoom, roomParticipants } = require('./utils/room');
const { getCorsOptions } = require('./utils/cors');

// socket.id -> { name, color }
// presence lives here, in memory: the DB flag can go stale when a
// socket dies without a clean disconnect (browser killed, server restart)
const onlineUsers = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: getCorsOptions()
  });

  // deliver an event to everyone in a room:
  // group -> everybody, dm -> only the two participants
  function emitToRoom(room, event, payload, exceptName = null) {
    if (!isDmRoom(room)) {
      io.emit(event, payload);
      return;
    }
    for (const name of roomParticipants(room)) {
      if (name === exceptName) continue;
      for (const [socketId, u] of onlineUsers) {
        if (u.name === name) io.to(socketId).emit(event, payload);
      }
    }
  }

  async function broadcastMembers() {
    const members = await userStore.getMembers();
    const present = new Set([...onlineUsers.values()].map((u) => u.name));
    io.emit('members:update', members.map((member) => ({ ...member, online: present.has(member.name) })));
  }

  // the REST controller reuses the same delivery logic
  io.emitToRoom = emitToRoom;

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

      // seed unread badges from the database (survives refreshes)
      try {
        const unread = await messageStore.getUnreadCounts(name);
        socket.emit('unread:update', unread);
      } catch (err) {
        console.error('Could not load unread counts:', err.message);
      }
    });

    socket.on('message:send', async (payload) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('message:error', { message: 'You must join before sending messages' });
        return;
      }

      const text = payload?.text ? String(payload.text).trim().slice(0, 1000) : '';
      if (!text && !payload?.file) {
        socket.emit('message:error', { message: 'Message cannot be empty' });
        return;
      }

      try {
        const message = await messageService.addMessage({
          text,
          user,
          to: payload.to,
          file: payload.file
        });
        emitToRoom(message.room, 'message:new', message);
      } catch (err) {
        console.error('Could not store message:', err.message);
        socket.emit('message:error', { message: err.status === 400 ? err.message : 'Could not store your message, try again' });
      }
    });

    socket.on('typing', ({ isTyping, to } = {}) => {
      const user = socket.data.user;
      if (!user) return;

      const room = to ? dmRoom(user.name, String(to).slice(0, 20)) : 'group';
      const payload = { user: user.name, isTyping: Boolean(isTyping), room };

      if (room === 'group') {
        socket.broadcast.emit('typing', payload);
      } else {
        // only the other participant should see the typing bubble
        emitToRoom(room, 'typing', payload, user.name);
      }
    });

    socket.on('message:read', async ({ messageId }) => {
      const user = socket.data.user;
      if (!user || !messageId) return;

      try {
        const updated = await messageService.markRead(messageId, user.name);
        if (updated) {
          emitToRoom(updated.room, 'message:read', updated);
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
