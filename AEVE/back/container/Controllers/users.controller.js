// controllers/users.controller.js
const { User } = require('../Models');
const { hashPassword } = require('../utils/password');
const { logAudit } = require('../utils/audit.utils');
const { comparePassword } = require('../utils/password'); // Make sure to import comparePassword
async function createWorker(req, res) {
  const { name, email, phone, password, role, pin } = req.body;
  try {
   
    const hash = await hashPassword(password || 'changeme');
    const user = await User.create({
      name,
      email,
      phone,
      password_hash: hash,
      role,
      pin,
    });

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CREATE_USER',
      details: `Created user ${user.name} (${user.role})`,
    });

    res.status(201).json({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Create worker error', error: err.message });
  }
}

async function updateWorker(req, res) {
  const { id } = req.params;
  const { name, email, phone, password, role, pin } = req.body;
  
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare update data
    const updateData = { name, email, phone, role, pin };
    
    // Only update password if provided
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }

    await user.update(updateData);

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_USER',
      details: `Updated user ${user.name} (${user.role})`,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Update worker error', error: err.message });
  }
}

async function deleteWorker(req, res) {
  const { id } = req.params;
  
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'DELETE_USER',
      details: `Deleted user ${user.name} (${user.role})`,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete worker error', error: err.message });
  }
}

async function listWorkers(req, res) {
  try {
    const workers = await User.findAll({
      where: { role: 'worker' },
      attributes: ['id', 'name', 'email', 'phone', 'role', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
async function getCurrentUser(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        pin: user.pin,
        created_at: user.created_at,
        is_active: user.is_active
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user data', error: err.message });
  }
}

async function updateCurrentUser(req, res) {
  const { name, email, phone, currentPassword, newPassword } = req.body;
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare update data
    const updateData = { name, email, phone };

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      
      const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      updateData.password_hash = await hashPassword(newPassword);
    }

    await user.update(updateData);

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_PROFILE',
      details: `Updated their own profile`,
    });

    // Return updated user without password hash
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        created_at: updatedUser.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Update profile error', error: err.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'role', 'created_at'],
      order: [['name', 'ASC']]
    });
    
    console.log(`✅ [getAllUsers] Found ${users.length} users`);
    
    res.json({ 
      success: true,
      users 
    });
  } catch (err) {
    console.error('❌ [getAllUsers] Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users', 
      error: err.message 
    });
  }
}

module.exports = { createWorker, listWorkers, updateWorker, deleteWorker,updateCurrentUser, getCurrentUser , getAllUsers // Add this
};