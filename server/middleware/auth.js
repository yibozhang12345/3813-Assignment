// server/middleware/auth.js
// JWT认证中间件 / JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥 / JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT令牌 / Generate JWT token
 * @param {Object} user 用户对象 / User object
 * @returns {string} JWT令牌 / JWT token
 */
function generateToken(user) {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    roles: user.roles
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT令牌中间件 / Verify JWT token middleware
 * @param {Object} req Express请求对象 / Express request object
 * @param {Object} res Express响应对象 / Express response object
 * @param {Function} next Express下一个中间件 / Express next middleware
 */
async function verifyToken(req, res, next) {
  try {
    // 从请求头获取令牌 / Get token from request header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required / 需要访问令牌',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " / Remove "Bearer "

    // 验证令牌 / Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 从数据库获取用户信息 / Get user info from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found / 无效令牌 - 用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 将用户信息添加到请求对象 / Add user info to request object
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token / 无效令牌',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired / 令牌已过期',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed / 令牌验证失败',
      code: 'VERIFICATION_FAILED'
    });
  }
}

/**
 * 检查用户是否有指定角色 / Check if user has specified role
 * @param {string|Array} requiredRoles 必需的角色 / Required roles
 * @returns {Function} Express中间件函数 / Express middleware function
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required / 需要身份认证',
          code: 'AUTH_REQUIRED'
        });
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const userRoles = user.roles || [];

      // 超级管理员拥有所有权限 / Super admin has all permissions
      if (userRoles.includes('super')) {
        return next();
      }

      // 检查用户是否有任一所需角色 / Check if user has any required role
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions / 权限不足',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: userRoles
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed / 权限检查失败',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
}

/**
 * 可选的认证中间件（不要求必须认证）/ Optional authentication middleware (does not require authentication)
 * @param {Object} req Express请求对象 / Express request object
 * @param {Object} res Express响应对象 / Express response object
 * @param {Function} next Express下一个中间件 / Express next middleware
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }

    next();
  } catch (error) {
    // 可选认证失败时继续执行，但不设置用户信息 / Continue execution when optional auth fails, but don't set user info
    next();
  }
}

/**
 * 检查群组权限中间件 / Check group permission middleware
 * @param {string} action 操作类型 / Action type ('read', 'write', 'admin')
 * @returns {Function} Express中间件函数 / Express middleware function
 */
function requireGroupPermission(action = 'read') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const groupId = req.params.groupId || req.body.groupId;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required / 需要身份认证',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required / 需要群组ID',
          code: 'GROUP_ID_REQUIRED'
        });
      }

      const Group = require('../models/Group');
      const group = await Group.findById(groupId);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found / 群组不存在',
          code: 'GROUP_NOT_FOUND'
        });
      }

      const userId = user._id.toString();

      // 超级管理员拥有所有权限 / Super admin has all permissions
      if (user.roles.includes('super')) {
        req.group = group;
        return next();
      }

      // 根据操作类型检查权限 / Check permissions based on action type
      let hasPermission = false;

      switch (action) {
        case 'read':
          // 群组成员可以读取 / Group members can read
          hasPermission = group.isMember(userId);
          break;
        case 'write':
          // 群组成员可以写入 / Group members can write
          hasPermission = group.isMember(userId);
          break;
        case 'admin':
          // 群组管理员或拥有者可以管理 / Group admins or owner can manage
          hasPermission = group.isAdmin(userId) || group.isOwner(userId);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient group permissions / 群组权限不足',
          code: 'INSUFFICIENT_GROUP_PERMISSIONS'
        });
      }

      req.group = group;
      next();
    } catch (error) {
      console.error('Group permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Group permission check failed / 群组权限检查失败',
        code: 'GROUP_PERMISSION_CHECK_FAILED'
      });
    }
  };
}

module.exports = {
  generateToken,
  verifyToken,
  requireRole,
  optionalAuth,
  requireGroupPermission,
  JWT_SECRET,
  JWT_EXPIRES_IN
};