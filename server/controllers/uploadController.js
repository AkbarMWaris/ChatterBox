const uploadService = require('../services/uploadService');
const { uploadsBucket } = require('../config/gridfs');

exports.uploadFile = (req, res, next) => {
  uploadService.upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const error = new Error(`File is too large (max ${uploadService.MAX_VIDEO_BYTES / (1024 * 1024)} MB)`);
        error.status = 413;
        return next(error);
      }
      return next(err);
    }
    if (!req.file) {
      const error = new Error('No file was uploaded');
      error.status = 400;
      return next(error);
    }
    try {
      const proto = req.get('X-Forwarded-Proto') || req.protocol;
      const data = await uploadService.storeFile(req.file, `${proto}://${req.get('host')}`);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });
};

// stream a stored file back to the browser, with Range support so
// <video> can seek and skip ahead while playing
exports.getFile = async (req, res, next) => {
  const id = uploadService.fileId(req.params.id);
  if (!id) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  try {
    const file = await uploadsBucket().find({ _id: id }).limit(1).next();
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const size = file.length;
    // the driver does not persist the `contentType` write option, so the real
    // mimetype is read from metadata (set at upload time)
    const mime = file.metadata?.mime || file.contentType || 'application/octet-stream';
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      req.query.download
        ? `attachment; filename="${encodeURIComponent(file.filename)}"`
        : `inline; filename="${encodeURIComponent(file.filename)}"`
    );

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return res.status(416).json({ success: false, message: 'Invalid range' });
      }
      const start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : size - 1;
      if (start >= size || start > end) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return res.status(416).json({ success: false, message: 'Invalid range' });
      }
      end = Math.min(end, size - 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      // driver's `end` option is exclusive, so +1 to include the last byte
      return uploadsBucket().openDownloadStream(id, { start, end: end + 1 }).pipe(res);
    }

    res.setHeader('Content-Length', size);
    uploadsBucket().openDownloadStream(id).pipe(res);
  } catch (err) {
    next(err);
  }
};
