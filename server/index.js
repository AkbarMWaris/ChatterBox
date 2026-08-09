const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/uploads');
const { initSocket } = require('./socket');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { getCorsOptions } = require('./utils/cors');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

app.use(cors(getCorsOptions()));
app.use(express.json());

// let controllers access the socket instance
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'server is up and running' });
});

app.use('/api/messages', messageRoutes);
app.use('/api', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Chat server listening on http://localhost:${PORT}`);
  });
});
