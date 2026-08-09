const Message = require('../models/Message');
const User = require('../models/User');

const MAX_HISTORY = 100;

// shape documents into the API/socket payload the rest of the app expects
function serialize(doc) {
  return {
    id: doc.id,
    text: doc.text,
    user: doc.user,
    createdAt: doc.createdAt,
    readBy: doc.readBy,
    status: doc.status
  };
}

async function getMessages(limit = 50) {
  const messages = await Message.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages.reverse().map(serialize);
}

async function addMessage({ text, user }) {
  const message = await Message.create({
    text,
    user: { name: user.name, color: user.color },
    readBy: [],
    status: 'delivered'
  });

  pruneOldMessages();
  return serialize(message);
}

// keep the database from growing forever - only the newest messages matter
async function pruneOldMessages() {
  try {
    const firstToDrop = await Message.find()
      .sort({ createdAt: -1 })
      .skip(MAX_HISTORY)
      .limit(1)
      .select('createdAt id')
      .lean();

    if (firstToDrop.length > 0) {
      await Message.deleteMany({ createdAt: { $lte: firstToDrop[0].createdAt } });
    }
  } catch (err) {
    console.error('Could not prune old messages:', err.message);
  }
}

// a message counts as "read" once every OTHER group member has seen it
async function markRead(messageId, readerName) {
  const message = await Message.findOne({ id: messageId });
  if (!message) return null;

  const isSender = message.user.name === readerName;
  if (!isSender && !message.readBy.includes(readerName)) {
    message.readBy.push(readerName);
  }
  if (!isSender) {
    const otherMembers = await User.find({ name: { $ne: message.user.name } }).select('name').lean();
    const everyoneRead = otherMembers.length > 0 && otherMembers.every((m) => message.readBy.includes(m.name));
    message.status = everyoneRead ? 'read' : 'delivered';
  }

  if (message.isModified()) {
    await message.save();
  }
  return serialize(message);
}

module.exports = { getMessages, addMessage, markRead };
