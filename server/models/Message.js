const mongoose = require('mongoose');
const crypto = require('crypto');

// the client relies on a string `id`, so each message also gets a UUID
// (the internal Mongo _id is never exposed to the API)
const messageSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    room: { type: String, default: 'group', index: true },
    text: { type: String, default: '', trim: true, maxlength: 1000 },
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    file: {
      id: { type: String, default: null },
      url: { type: String, default: null },
      name: { type: String, default: null },
      size: { type: Number, default: null },
      mime: { type: String, default: null }
    },
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
