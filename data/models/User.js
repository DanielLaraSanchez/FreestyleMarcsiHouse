const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  googleId: String,
  email: { type: String, unique: true },
  password: String,
  name: String,
  profilePicture: String,
  stats: {
    points: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    battles: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  isOnline: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 1 }, // Initialize tokenVersion
});

// Hash password before saving
userSchema.pre('save', function (next) {
  const user = this;
  if (!user.isModified('password')) return next();
  bcrypt.hash(user.password, 10, function (err, hash) {
    if (err) return next(err);
    user.password = hash;
    next();
  });
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword, cb) {
  if (!this.password) {
    // No password set (e.g., Google account)
    return cb(null, false);
  }
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

module.exports = mongoose.model('User', userSchema);