const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET =  '2afc608747c1d3c8050bf51ad170e891';
function sign(payload, expiresIn = '12h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}
module.exports = { sign, verify };
