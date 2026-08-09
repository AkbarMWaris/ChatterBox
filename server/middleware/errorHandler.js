exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  console.error('Request failed:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong on the server' : err.message
  });
};
