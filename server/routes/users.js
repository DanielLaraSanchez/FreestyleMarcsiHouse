const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// Get online users
router.get('/online', UserController.getOnlineUsers);

// Get users by IDs
router.post('/getByIds', UserController.getUsersByIds);

// Get a user by ID
router.get('/:id', UserController.getUserById);

// Get all users
router.get('/', UserController.getAllUsers);

module.exports = router;

