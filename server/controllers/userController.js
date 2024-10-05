const User = require('../data/models/User');

const UserController = {
  // Get all users (exclude sensitive fields)
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({}, '-password -email -googleId');
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Get a user by ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id, '-password -email -googleId');
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Add this method
  getUsersByIds: async (req, res) => {
    const { ids } = req.body;
    try {
      const users = await User.find(
        { _id: { $in: ids } },
        '-password -email -googleId'
      );
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = UserController;