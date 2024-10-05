const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// Existing routes
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);

// Add this route
router.post('/getByIds', UserController.getUsersByIds);

module.exports = router;