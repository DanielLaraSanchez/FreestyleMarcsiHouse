const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./data/models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: '22638002158-v7r9rsf3vjdn59vqsdsavt8mncui3k8m.apps.googleusercontent.com', // Replace with your Google Client ID
      clientSecret: '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', // Replace with your Google Client Secret
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // Find or create the user
      const { id, displayName, emails, photos } = profile;
      try {
        let user = await User.findOne({ googleId: id });
        if (user) {
          return done(null, user);
        } else {
          user = new User({
            googleId: id,
            email: emails[0].value,
            name: displayName,
            profilePicture: photos[0].value,
          });
          await user.save();
          return done(null, user);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;