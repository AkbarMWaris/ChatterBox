const messageStore = require('../store/messageStore');
const userStore = require('../store/userStore');
const { colorForName } = require('../utils/color');

async function getMessages(limit) {
  return messageStore.getMessages(limit);
}

async function addMessage({ text, user }) {
  const cleanText = text ? String(text).trim().slice(0, 1000) : '';
  const name = user?.name ? String(user.name).trim().slice(0, 20) : '';
  if (!cleanText || !name) {
    const error = new Error('Message text and a valid user are required');
    error.status = 400;
    throw error;
  }

  // make sure the sender is part of the group registry too
  await userStore.setOnline({ name, color: user.color || colorForName(name) });
  return messageStore.addMessage({ text: cleanText, user: { name, color: user.color || colorForName(name) } });
}

async function markRead(messageId, readerName) {
  return messageStore.markRead(messageId, readerName);
}

module.exports = { getMessages, addMessage, markRead };
