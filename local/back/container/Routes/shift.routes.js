const express = require('express');
const router = express.Router();
const shiftController = require('../Controllers/shift.controller');
const authenticate = require('../middlewares/auth.middleware');

router.post('/clock-in', authenticate, shiftController.clockIn);
router.post('/clock-out', authenticate, shiftController.clockOut);
router.get('/active', authenticate, shiftController.getActiveShift);
router.get('/', authenticate, shiftController.getShifts);

module.exports = router;
