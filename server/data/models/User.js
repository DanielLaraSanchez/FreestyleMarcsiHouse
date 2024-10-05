const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  googleId: { type: String }, // For Google OAuth users
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String },
  profilePicture: { type: String },
});

// Hash password before saving
UserSchema.pre('save', function (next) {
  const user = this;

  // Only hash password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  // Generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
    if (err) return next(err);

    // Hash the password using the new salt
    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) return next(error);

      // Override the cleartext password with the hashed one
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