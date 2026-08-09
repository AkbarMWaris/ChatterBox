// builds the CORS origin list shared by Express and Socket.io.
// CLIENT_URL can hold one origin or a comma-separated list, e.g.
//   CLIENT_URL="http://localhost:3000,https://chatterbox-nneww.vercel.app"
// or "*" to allow every origin (handy while the frontend URL is still unknown).
function getCorsOptions() {
  const raw = process.env.CLIENT_URL || 'http://localhost:3000';
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAll = origins.includes('*');

  return {
    origin(origin, callback) {
      // non-browser clients (tests, curl) send no Origin header
      if (allowAll || !origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  };
}

module.exports = { getCorsOptions };
