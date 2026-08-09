const mongoose = require('mongoose');
const crypto = require('crypto');

// the client relies on a string `id`, so each message also gets a UUID
// (the internal Mongo _id is never exposed to the API)
const messageSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    room: { type: String, default: 'group', index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    user: {
      name: { type: String, required: true },
      color: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now },
    readBy: { type: [String], default: [] },
    status: { type: String, enum: ['delivered', 'read'], default: 'delivered' }
  },
  { versionKey: false }
);

messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
