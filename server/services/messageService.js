const messageStore = require('../store/messageStore');
const userStore = require('../store/userStore');
const { colorForName } = require('../utils/color');
const { dmRoom, isDmRoom, roomParticipants } = require('../utils/room');

async function getMessages(room = 'group', limit) {
  const cleanRoom = room === 'dm' ? 'group' : room;
  return messageStore.getMessages(cleanRoom, limit);
}

async function addMessage({ text, user, to }) {
  const cleanText = text ? String(text).trim().slice(0, 1000) : '';
  const name = user?.name ? String(user.name).trim().slice(0, 20) : '';
  if (!cleanText || !name) {
    const error = new Error('Message text and a valid user are required');
    error.status = 400;
    throw error;
  }

  // make sure the sender is part of the group registry too
  await userStore.setOnline({ name, color: user.color || colorForName(name) });

  const room = to
    ? dmRoom(name, String(to).trim().slice(0, 20))
    : 'group';

  // only members can be DM'd
  if (isDmRoom(room) && !roomParticipants(room).includes(name)) {
    const error = new Error('You cannot message that user');
    error.status = 400;
    throw error;
  }

  return messageStore.addMessage({
    text: cleanText,
    user: { name, color: user.color || colorForName(name) },
    room
  });
}

async function markRead(messageId, readerName) {
  return messageStore.markRead(messageId, readerName);
}

module.exports = { getMessages, addMessage, markRead };
