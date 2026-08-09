const Message = require('../models/Message');
const User = require('../models/User');
const { isDmRoom, roomParticipants } = require('../utils/room');

const MAX_HISTORY = 100;

// shape documents into the API/socket payload the rest of the app expects
function serialize(doc) {
  return {
    id: doc.id,
    room: doc.room,
    text: doc.text,
    type: doc.type,
    file: doc.file,
    user: doc.user,
    createdAt: doc.createdAt,
    readBy: doc.readBy,
    status: doc.status
  };
}

async function getMessages(room = 'group', limit = 50) {
  const messages = await Message.find({ room })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages.reverse().map(serialize);
}

async function addMessage({ text, user, room = 'group', type = 'text', file = null }) {
  const message = await Message.create({
    room,
    text,
    type,
    file,
    user: { name: user.name, color: user.color },
    readBy: [],
    status: 'delivered'
  });

  pruneOldMessages(room);
  return serialize(message);
}

// keep the database from growing forever - only the newest messages matter
async function pruneOldMessages(room) {
  try {
    const firstToDrop = await Message.find({ room })
      .sort({ createdAt: -1 })
      .skip(MAX_HISTORY)
      .limit(1)
      .select('createdAt id')
      .lean();

    if (firstToDrop.length > 0) {
      await Message.deleteMany({ room, createdAt: { $lte: firstToDrop[0].createdAt } });
    }
  } catch (err) {
    console.error('Could not prune old messages:', err.message);
  }
}

// who counts as "everyone else" for a message:
// the whole group, or just the other participant in a private chat
async function otherReadersOf(message) {
  if (isDmRoom(message.room)) {
    return roomParticipants(message.room)
      .filter((name) => name !== message.user.name)
      .map((name) => ({ name }));
  }
  return User.find({ name: { $ne: message.user.name } }).select('name').lean();
}

// a message counts as "read" once every OTHER participant has seen it
async function markRead(messageId, readerName) {
  const message = await Message.findOne({ id: messageId });
  if (!message) return null;

  const isSender = message.user.name === readerName;
  if (!isSender && !message.readBy.includes(readerName)) {
    message.readBy.push(readerName);
  }
  if (!isSender) {
    const others = await otherReadersOf(message);
    const everyoneRead = others.length > 0 && others.every((m) => message.readBy.includes(m.name));
    message.status = everyoneRead ? 'read' : 'delivered';
  }

  if (message.isModified()) {
    await message.save();
  }
  return serialize(message);
}

// how many messages in each room the user has not read yet
async function getUnreadCounts(userName) {
  const messages = await Message.find({
    'user.name': { $ne: userName },
    readBy: { $ne: userName }
  })
    .select('room')
    .lean();

  return messages.reduce((counts, message) => {
    counts[message.room] = (counts[message.room] || 0) + 1;
    return counts;
  }, {});
}

module.exports = { getMessages, addMessage, markRead, getUnreadCounts };
