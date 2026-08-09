const mongoose = require('mongoose');

// every person who has ever joined the group, kept so group info can
// list members even when they are offline
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, maxlength: 20 },
    color: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    online: { type: Boolean, default: false }
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
