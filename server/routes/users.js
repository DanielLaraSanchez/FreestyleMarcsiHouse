const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get a list of users
router.get('/', authMiddleware, UserController.getAllUsers);

// Get a single user by ID
router.get('/:id', authMiddleware, UserController.getUserById);

module.exports = router;