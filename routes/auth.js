const express = require('express');
const router = express.Router();
const passport = require('passport');
const AuthController = require('../controllers/authController');

// Define routes
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  AuthController.googleCallback
);

// Export the router
module.exports = router;