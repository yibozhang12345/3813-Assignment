// server/routes/auth.js
// 用户认证路由 / User authentication routes
const express = require('express');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 用户注册 / User registration
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // 验证必填字段 / Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required / 邮箱和密码为必填项',
        code: 'MISSING_FIELDS'
      });
    }

    // 验证邮箱格式 / Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format / 邮箱格式无效',
        code: 'INVALID_EMAIL'
      });
    }

    // 验证密码强度 / Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long / 密码至少6个字符',
        code: 'WEAK_PASSWORD'
      });
    }

    // 创建用户 / Create user
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      username: username?.trim(),
      roles: ['user']
    };

    // 如果用户名是 'super'，给予超级管理员权限 / If username is 'super', grant super admin role
    if (username?.toLowerCase() === 'super') {
      userData.roles = ['super'];
    }

    const user = await User.create(userData);

    // 生成JWT令牌 / Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully / 用户注册成功',
      data: {
        user: user.toSafeJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('Email already exists') || error.message.includes('邮箱已存在')) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists / 邮箱已存在',
        code: 'EMAIL_EXISTS'
      });
    }

    if (error.message.includes('Username already exists') || error.message.includes('用户名已存在')) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists / 用户名已存在',
        code: 'USERNAME_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed / 注册失败',
      code: 'REGISTRATION_FAILED'
    });
  }
});

/**
 * 用户登录 / User login
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证必填字段 / Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required / 邮箱和密码为必填项',
        code: 'MISSING_FIELDS'
      });
    }

    // 查找用户 / Find user
    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password / 邮箱或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 验证密码 / Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password / 邮箱或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 生成JWT令牌 / Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful / 登录成功',
      data: {
        user: user.toSafeJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed / 登录失败',
      code: 'LOGIN_FAILED'
    });
  }
});

/**
 * 获取当前用户信息 / Get current user info
 * GET /api/auth/me
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'User info retrieved successfully / 获取用户信息成功',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info / 获取用户信息失败',
      code: 'GET_USER_INFO_FAILED'
    });
  }
});

module.exports = router;