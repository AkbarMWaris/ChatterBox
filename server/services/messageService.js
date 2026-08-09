const messageStore = require('../store/messageStore');
const userStore = require('../store/userStore');
const { colorForName } = require('../utils/color');
const { dmRoom, isDmRoom, roomParticipants } = require('../utils/room');

async function getMessages(room = 'group', limit) {
  const cleanRoom = room === 'dm' ? 'group' : room;
  return messageStore.getMessages(cleanRoom, limit);
}

async function addMessage({ text, user, to, type, file }) {
  const cleanText = text ? String(text).trim().slice(0, 1000) : '';
  const name = user?.name ? String(user.name).trim().slice(0, 20) : '';

  // a message needs text and/or an attachment
  const cleanFile = sanitizeFile(file);
  if ((!cleanText && !cleanFile) || !name) {
    const error = new Error('Message text or a file and a valid user are required');
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
    room,
    type: cleanFile ? cleanFile.type : 'text',
    file: cleanFile
  });
}

// whitelist the attachment fields the client may send; anything else is dropped
function sanitizeFile(file) {
  if (!file || typeof file !== 'object') return null;
  const id = file.id && String(file.id).slice(0, 40);
  const url = file.url && String(file.url).slice(0, 200);
  const mime = file.mime && String(file.mime).slice(0, 100);
  if (!id || !url || !mime) return null;
  if (!mime.startsWith('image/') && !mime.startsWith('video/')) return null;

  return {
    id,
    url,
    type: mime.startsWith('image/') ? 'image' : 'video',
    name: file.name ? String(file.name).slice(0, 100) : '',
    size: Number.isFinite(Number(file.size)) ? Number(file.size) : 0,
    mime
  };
}

async function markRead(messageId, readerName) {
  return messageStore.markRead(messageId, readerName);
}

module.exports = { getMessages, addMessage, markRead };
