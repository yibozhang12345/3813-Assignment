const express = require('express');
const router = express.Router();
const { getChannels, createChannel } = require('../controllers/channelController');

// 获取某个群组下的频道
router.get('/:groupId', getChannels);

// 在群组中创建频道
router.post('/:groupId', createChannel);

module.exports = router;
