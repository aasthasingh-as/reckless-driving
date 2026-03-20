const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_secret_key_123';

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid',
    });
  }
};