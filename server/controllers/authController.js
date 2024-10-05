const User = require('../data/models/User');
const jwt = require('jsonwebtoken');

const AuthController = {
  signup: async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: 'Email already exists' });

      const user = new User({ email, password, name });
      await user.save();

      res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
      console.log(err, "mal")
      res.status(500).json({ message: err.message });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: 'Invalid email or password' });

      user.comparePassword(password, (err, isMatch) => {
        if (err) throw err;
        if (!isMatch)
          return res.status(400).json({ message: 'Invalid email or password' });

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: '1d',
        });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  googleCallback: (req, res) => {
    // User is authenticated, generate JWT
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
  
    // Redirect back to Angular app with token as a query parameter
    res.redirect(`http://localhost:4200/auth/callback?token=${token}`);
  },
};

module.exports = AuthController;
