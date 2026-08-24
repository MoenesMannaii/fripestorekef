const { Shift, User, Order } = require('../Models');
const { Op } = require('sequelize');

/**
 * POST /api/shifts/clock-in
 * Start a new shift for the logged-in user
 */
const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { starting_cash } = req.body;

    // Check if user already has an active shift
    const activeShift = await Shift.findOne({
      where: { user_id: userId, status: 'active' }
    });

    if (activeShift) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une session active. Veuillez clôturer avant d\'en ouvrir une nouvelle.',
        shift: activeShift
      });
    }

    const newShift = await Shift.create({
      user_id: userId,
      starting_cash: starting_cash || 0.00,
      start_time: new Date(),
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Session démarrée avec succès',
      data: newShift
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/shifts/clock-out
 * End the active shift for the logged-in user
 */
const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ending_cash, notes } = req.body;

    const activeShift = await Shift.findOne({
      where: { user_id: userId, status: 'active' }
    });

    if (!activeShift) {
      return res.status(404).json({
        success: false,
        message: 'Aucune session active trouvée.'
      });
    }

    await activeShift.update({
      end_time: new Date(),
      status: 'closed',
      ending_cash: ending_cash || 0,
      notes: notes || null
    });

    res.json({
      success: true,
      message: 'Session clôturée avec succès',
      data: activeShift
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/shifts/active
 * Returns the currently active shift for the logged-in user
 */
const getActiveShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeShift = await Shift.findOne({
      where: { user_id: userId, status: 'active' },
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    res.json({ success: true, data: activeShift });
  } catch (error) {
    console.error('Get active shift error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/shifts
 * List shifts (admin: all, worker: own only)
 */
const getShifts = async (req, res) => {
  try {
    const { userId, date, limit = 20 } = req.query;
    const where = {};

    // Workers can only see their own shifts
    if (req.user.role === 'worker') {
      where.user_id = req.user.id;
    } else if (userId) {
      where.user_id = userId;
    }

    if (date) {
      where.start_time = {
        [Op.between]: [
          new Date(date + 'T00:00:00.000+01:00'),
          new Date(date + 'T23:59:59.999+01:00')
        ]
      };
    }

    const shifts = await Shift.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['start_time', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { clockIn, clockOut, getActiveShift, getShifts };
