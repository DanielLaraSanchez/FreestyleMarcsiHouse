const jwt = require('jsonwebtoken');

const authMiddleware = function (req, res, next) {
  const token = req.headers['authorization'];

  if (!token)
    return res.status(401).json({ message: 'Access token is missing or invalid' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;