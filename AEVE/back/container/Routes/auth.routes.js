// routes/auth.js
const express = require('express');
const router = express.Router();
const { login, logout, getWorkers } = require('../Controllers/auth.controller');
const { verify } = require('../utils/jwt');

// Routes
router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.get('/workers', getWorkers);
router.get('/verify-token', verifyTokenRoute);

// Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verify(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function verifyTokenRoute(req, res) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ valid: false, message: 'No token provided' });

  try {
    const payload = verify(token);
    res.json({ valid: true, payload });
  } catch (err) {
    res.status(401).json({ valid: false, message: err.message });
  }
}

module.exports = router;