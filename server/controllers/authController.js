const User = require('../data/models/User');
const jwt = require('jsonwebtoken');

const AuthController = {
  signup: async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: 'Email already exists' });

      const user = new User({
        email,
        password,
        name,
        stats: {}, // Initialize stats
        profilePicture: '', // Set a default profile picture if needed
      });
      user.tokenVersion += 1;
      await user.save();

      const token = jwt.sign(
        { id: user._id, tokenVersion: user.tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
      console.log(err, "Error during signup");
      res.status(500).json({ message: err.message });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;
console.log("wqokds")
    try {
      const user = await User.findOne({ email });
      console.log("wqokds")

      if (!user)
        return res.status(400).json({ message: 'Invalid email or password' });

      user.comparePassword(password, (err, isMatch) => {
        console.log("compared password")
        if (err) throw err;
        if (!isMatch)
          return res.status(400).json({ message: 'Invalid email or password comparePassword' });

        // Generate JWT
        const token = jwt.sign(
          { id: user._id, tokenVersion: user.tokenVersion },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
      });
    } catch (err) {
      console.log(err, "err")
      res.status(500).json({ message: err.message });
    }
  },
  googleCallback: (req, res) => {
    // User is authenticated, generate JWT
    const user = req.user;
    
    const token = jwt.sign({ id: user._id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
  
    // Redirect back to Angular app with token as a query parameter
    res.redirect(`http://localhost:4200/auth/google/callback?token=${token}`);
  },
};

module.exports = AuthController;
