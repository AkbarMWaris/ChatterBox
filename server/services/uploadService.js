const multer = require('multer');
const { uploadsBucket } = require('../config/gridfs');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILENAME_LENGTH = 100;

// files are read into memory first, then streamed into GridFS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      const error = new Error('Only images and videos can be uploaded');
      error.status = 400;
      cb(error);
    }
  }
});

const fileId = (id) => {
  try {
    return require('mongoose').Types.ObjectId.createFromHexString(id);
  } catch {
    return null;
  }
};

// write one uploaded file into GridFS and return the payload messages use.
// baseUrl is the server's own origin, so the URL works from any frontend
async function storeFile(file, baseUrl) {
  const type = file.mimetype.startsWith('image/') ? 'image' : 'video';
  const bucket = uploadsBucket();

  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(
      String(file.originalname).slice(0, MAX_FILENAME_LENGTH),
      {
        contentType: file.mimetype,
        metadata: { type }
      }
    );

    stream.on('error', reject);
    stream.on('finish', () => {
      resolve({
        id: stream.id.toString(),
        url: `${baseUrl}/api/files/${stream.id}`,
        type,
        name: String(file.originalname).slice(0, MAX_FILENAME_LENGTH),
        size: file.size,
        mime: file.mimetype
      });
    });

    stream.end(file.buffer);
  });
}

module.exports = { upload, storeFile, fileId, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES };
