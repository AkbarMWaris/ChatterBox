const express = require('express');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

router.post('/upload', uploadController.uploadFile);
router.get('/files/:id', uploadController.getFile);

module.exports = router;
