const express = require('express');
const router = express.Router();
const aiController = require('../Controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/inventory', aiController.getInventoryAlerts);
router.get('/anomalies', aiController.getAnomalyDetection);
router.get('/forecast', aiController.getSalesForecast);
router.get('/top-products', aiController.getTopProducts);
router.get('/daily-stats', aiController.getDailyStats);

module.exports = router;
