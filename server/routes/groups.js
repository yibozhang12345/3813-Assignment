const express = require('express');
const router = express.Router();
const { getGroups, createGroup } = require('../controllers/groupController');

// 获取所有群组
router.get('/', getGroups);

// 创建新群组（管理员权限）
router.post('/', createGroup);

module.exports = router;
