const { User } = require('../Models');
const { comparePassword } = require('../utils/password');
const { sign } = require('../utils/jwt');
const { logAudit } = require('../utils/audit.utils');
const logger = require('../utils/logger.utils');

// Simple in-memory rate limiter to prevent brute-force attacks
const loginAttempts = new Map();

async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Sanitize inputs
    const sanitizedEmail = email ? String(email).trim().toLowerCase() : null;
    const sanitizedPassword = password ? String(password) : null;

    // Check if both email and password are provided
    if (!sanitizedEmail || !sanitizedPassword) {
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    // Rate limiting: Delay response if multiple failed attempts
    const clientIp = req.ip;
    const attempts = loginAttempts.get(clientIp) || { count: 0, lastAttempt: Date.now() };

    if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 15 * 60 * 1000) {
      logger.warn(`BRUTE_FORCE_PREVENTION: IP blocked for 15 minutes - ${clientIp}`);
      return res.status(429).json({ message: 'محاولات كثيرة جدا. يرجى المحاولة لاحقا.' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email: sanitizedEmail } });
    if (!user) {
      // Record failed attempt
      loginAttempts.set(clientIp, { count: attempts.count + 1, lastAttempt: Date.now() });
      logger.warn(`FAILED_LOGIN: Attempt for non-existent email - ${sanitizedEmail} from ${clientIp}`);
      return res.status(401).json({ message: 'email' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'الحساب غير نشط' });
    }

    // Verify password
    const ok = await comparePassword(sanitizedPassword, user.password_hash);
    if (!ok) {
      // Record failed attempt
      loginAttempts.set(clientIp, { count: attempts.count + 1, lastAttempt: Date.now() });
      logger.warn(`FAILED_LOGIN: Incorrect password for user ${user.id} from ${clientIp}`);
      return res.status(401).json({ message: 'passw' });
    }

    // Reset attempts on success
    loginAttempts.delete(clientIp);

    // Generate token
    const token = sign({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    });

    // Log the login action
    await logAudit({
      actor_id: user.id,
      actor_role: user.role,
      action: 'LOGIN',
      details: `User ${user.name} logged in`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'خطأ في تسجيل الدخول', error: err.message });
  }
}

async function logout(req, res) {
  try {
    const userId = req.user?.id;
    await logAudit({
      actor_id: userId || null,
      actor_role: req.user?.role || "guest",
      action: "logout",
      details: "User logged out",
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Logout failed" });
  }
}

async function getWorkers(req, res) {
  try {
    console.log('🔍 [getWorkers] Starting to fetch workers...');

    const workers = await User.findAll({
      where: {
        role: 'worker',
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'role', 'is_active'],
      order: [['name', 'ASC']]
    });

    console.log(`✅ [getWorkers] Found ${workers.length} active workers`);

    workers.forEach(worker => {
      console.log(`   👤 ${worker.name} (ID: ${worker.id}, Email: ${worker.email})`);
    });

    res.json(workers);
  } catch (err) {
    console.error('❌ [getWorkers] Error:', err);
    res.status(500).json({
      message: 'Error fetching workers',
      error: err.message
    });
  }
}

module.exports = { login, logout, getWorkers };