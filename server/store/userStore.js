const User = require('../models/User');

function serialize(doc) {
  return {
    name: doc.name,
    color: doc.color,
    online: doc.online,
    lastSeen: doc.lastSeen
  };
}

// mark the user present and remember their avatar color
async function setOnline({ name, color }) {
  await User.findOneAndUpdate(
    { name },
    { color, online: true, lastSeen: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

async function setOffline(name) {
  await User.updateOne(
    { name },
    { online: false, lastSeen: new Date() }
  );
}

async function getMembers() {
  const members = await User.find().sort({ joinedAt: 1 }).lean();
  return members.map(serialize);
}

async function getMemberNames() {
  const members = await User.find().select('name').lean();
  return members.map((member) => member.name);
}

module.exports = { setOnline, setOffline, getMembers, getMemberNames };
