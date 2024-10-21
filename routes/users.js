const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get online users (protected route)
router.get('/online', authMiddleware, UserController.getOnlineUsers);

// Get users by IDs (protected route)
router.post('/getByIds', authMiddleware, UserController.getUsersByIds);

// Get a user by ID (protected route)
router.get('/:id', authMiddleware, UserController.getUserById);

// Get all users (protected route)
router.get('/', authMiddleware, UserController.getAllUsers);

module.exports = router;