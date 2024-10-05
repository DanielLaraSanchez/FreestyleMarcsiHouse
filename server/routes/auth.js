const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const passport = require('passport');

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/battlefield' }),
  AuthController.googleCallback
);

module.exports = router;