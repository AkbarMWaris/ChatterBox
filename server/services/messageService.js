const messageStore = require('../store/messageStore');

async function getMessages(limit) {
  return messageStore.getMessages(limit);
}

async function addMessage({ text, user }) {
  const cleanText = text ? String(text).trim().slice(0, 1000) : '';
  if (!cleanText || !user?.name) {
    const error = new Error('Message text and a valid user are required');
    error.status = 400;
    throw error;
  }
  return messageStore.addMessage({ text: cleanText, user });
}

async function markRead(messageId, readerName) {
  return messageStore.markRead(messageId, readerName);
}

module.exports = { getMessages, addMessage, markRead };
