const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./data/models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: '22638002158-v7r9rsf3vjdn59vqsdsavt8mncui3k8m.apps.googleusercontent.com', // Your Google Client ID
      clientSecret: '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', // Your Google Client Secret
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      // Find or create the user
      try {
        const { id, displayName, emails, photos } = profile;

        let user = await User.findOne({ googleId: id });
        if (user) {
          // User exists, update profile picture if changed
          if (user.profilePicture !== photos[0].value) {
            user.profilePicture = photos[0].value;
          }

          // Increment tokenVersion to invalidate previous tokens
          user.tokenVersion += 1;
          await user.save();

          return done(null, user);
        } else {
          // Check if user with the same email exists
          user = await User.findOne({ email: emails[0].value });
          if (user) {
            // Update user with googleId and profile picture
            user.googleId = id;
            user.profilePicture = photos[0].value;

            // Increment tokenVersion
            user.tokenVersion += 1;
            await user.save();

            return done(null, user);
          } else {
            // Create new user
            const newUser = new User({
              googleId: id,
              email: emails[0].value,
              name: displayName,
              profilePicture: photos[0].value,
              stats: {}, // Initialize stats
              tokenVersion: 1, // Initialize tokenVersion
            });
            await newUser.save();
            return done(null, newUser);
          }
        }
      } catch (err) {
        return done(err, null); // Handle errors
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