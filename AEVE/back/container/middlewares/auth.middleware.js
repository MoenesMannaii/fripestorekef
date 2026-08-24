// verifies JWT and attaches user to req.user
const { verify } = require('../utils/jwt');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = verify(token);
    req.user = payload; // { id, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authenticate;
