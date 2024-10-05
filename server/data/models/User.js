const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const StatsSchema = require('./Stats');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  googleId: { type: String }, // For Google OAuth users
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  profilePicture: { type: String },
  stats: { type: StatsSchema, default: () => ({}) },
  isOnline: { type: Boolean, default: false },
  status: { type: String },
  isInBattlefield: { type: Boolean, default: false },
});

// Hash password before saving
UserSchema.pre('save', function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) return next(error);

      user.password = hash;
      next();
    });
  });
});

// Method to compare password
UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

module.exports = mongoose.model('User', UserSchema);