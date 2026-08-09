const messageService = require('../services/messageService');

exports.getMessages = async (req, res, next) => {
  try {
    const room = req.query.room || 'group';
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await messageService.getMessages(room, limit);
    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { text, user, to } = req.body;
    const message = await messageService.addMessage({ text, user, to });

    // broadcast through the socket so everyone gets it in real time
    req.io.emitToRoom(message.room, 'message:new', message);

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};