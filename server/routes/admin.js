const express = require('express');
const mongoDataStore = require('../models/mongoDataStore');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Get all users (super admin only)
 * Returns a list of all users in the system.
 */
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await mongoDataStore.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Failed to get user list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user list',
      error: error.message
    });
  }
});

/**
 * Get all groups (super admin only)
 * Returns a list of all groups in the system.
 */
router.get('/groups', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const groups = await mongoDataStore.getGroups();
    res.json(groups);
  } catch (error) {
    console.error('Failed to get group list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get group list',
      error: error.message
    });
  }
});

/**
 * Delete a user (super admin only)
 * Prevents deleting your own account.
 */
router.delete('/users/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting your own super admin account
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const result = await mongoDataStore.deleteUser(userId);

    if (result) {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

/**
 * Update user roles (super admin only)
 * Prevents removing your own super admin role.
 */
router.put('/users/:userId/roles', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Roles must be an array'
      });
    }

    // Validate roles
    const validRoles = ['user', 'group-admin', 'super-admin'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid roles: ${invalidRoles.join(', ')}`
      });
    }

    // Prevent removing your own super admin role
    if (req.user.id === userId && !roles.includes('super-admin')) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own super admin role'
      });
    }

    const updatedUser = await mongoDataStore.updateUser(userId, { roles });

    if (updatedUser) {
      res.json({
        success: true,
        message: 'User roles updated successfully',
        user: updatedUser
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Failed to update user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user roles',
      error: error.message
    });
  }
});

module.exports = router;