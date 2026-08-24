const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { dailySummary } = require('../Controllers/reports.controller');

router.get('/daily', authMiddleware, dailySummary);

module.exports = router;