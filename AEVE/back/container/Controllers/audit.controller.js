const { AuditLog } = require('../Models');

// Create audit log manually
exports.createAuditLog = async (req, res) => {
  try {
    let { actor_id, actor_role, action, details } = req.body;

    // Resolve actor details via req.user from authenticate middleware
    if (req.user) {
      actor_id = req.user.id || actor_id;
      actor_role = req.user.role || actor_role;
      if (action === 'product_deletion' && req.user.name) {
        if (details && details.includes('undefined')) {
          details = details.replace('undefined', req.user.name);
        }
      }
    }

    const log = await AuditLog.create({ actor_id, actor_role, action, details });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create audit log' });
  }
};

// Get all audit logs (filterable)
exports.getAuditLogs = async (req, res) => {
  try {
    const { actor_id, actor_role, action, startDate, endDate, limit } = req.query;
    const { Op } = require('sequelize');
    const where = {};

    if (actor_id) where.actor_id = actor_id;
    if (actor_role) where.actor_role = actor_role;
    if (action) where.action = action;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = {
        [Op.between]: [start, end]
      };
    }

    const logLimit = parseInt(limit) || 1000;

    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: logLimit
    });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Get one log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

// Clear all logs
exports.clearAuditLogs = async (req, res) => {
  try {
    await AuditLog.destroy({ where: {} });
    res.json({ message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};
