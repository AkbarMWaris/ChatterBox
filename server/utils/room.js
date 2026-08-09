// rooms are 'group' for the shared chat, or 'dm:<name>:<name>' (sorted)
// for private conversations between two members
function dmRoom(a, b) {
  return `dm:${[a, b].sort().join(':')}`;
}

function isDmRoom(room) {
  return typeof room === 'string' && room.startsWith('dm:');
}

function roomParticipants(room) {
  if (!isDmRoom(room)) return [];
  return room.slice(3).split(':');
}

module.exports = { dmRoom, isDmRoom, roomParticipants };
