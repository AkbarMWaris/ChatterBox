const mongoose = require('mongoose');

// lazily-built GridFS bucket - files are streamed into MongoDB,
// so uploads survive server restarts and redeploys
let cached = null;

function uploadsBucket() {
  if (!cached) {
    cached = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
  }
  return cached;
}

module.exports = { uploadsBucket };
