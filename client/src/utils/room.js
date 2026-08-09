// must match the server's room scheme exactly
export function dmRoom(a, b) {
  return `dm:${[a, b].sort().join(':')}`;
}

export function isDmRoom(room) {
  return typeof room === 'string' && room.startsWith('dm:');
}
