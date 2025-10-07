// 认证中间件模块
// 该模块提供JWT令牌认证、生成和管理超级管理员权限验证的功能

const jwt = require('jsonwebtoken');

// JWT密钥，用于签名和验证令牌的安全性
const JWT_SECRET = 'your-secret-key-here';

/**
 * JWT令牌认证中间件
 * 验证请求头中的Authorization令牌，确认用户身份
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function authenticateToken(req, res, next) {
  // 从请求头获取Authorization字段
  const authHeader = req.headers['authorization'];
  // 提取Bearer令牌（格式：Bearer <token>）
  const token = authHeader && authHeader.split(' ')[1];

  // 如果没有提供令牌，返回401未授权错误
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // 验证JWT令牌
  jwt.verify(token, JWT_SECRET, (err, user) => {
    // 如果验证失败，返回403禁止访问错误
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    // 将用户信息添加到请求对象中
    req.user = user;
    // 继续执行下一个中间件
    next();
  });
}

/**
 * 生成JWT访问令牌
 * 为用户创建包含基本信息和角色的JWT令牌
 * @param {Object} user - 用户对象，包含id、username和roles
 * @returns {string} 生成的JWT令牌字符串
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: '24h' } // 令牌有效期24小时
  );
}

/**
 * 超级管理员权限验证中间件
 * 检查当前用户是否具有超级管理员角色
 * @param {Object} req - Express请求对象（需要包含已认证的用户信息）
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function requireSuperAdmin(req, res, next) {
  // 检查用户是否存在、是否有角色信息，以及是否包含超级管理员角色
  if (!req.user || !req.user.roles || !req.user.roles.includes('super-admin')) {
    return res.status(403).json({
      success: false,
      message: '需要超级管理员权限'
    });
  }
  // 权限验证通过，继续执行
  next();
}

// 导出认证相关函数，供其他模块使用
module.exports = { authenticateToken, generateToken, requireSuperAdmin };