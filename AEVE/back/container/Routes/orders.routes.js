const express = require('express');
const router = express.Router();
const ordersController = require('../Controllers/orders.controller');
const  authenticate  = require('../middlewares/auth.middleware');

// Existing routes
router.post('/', authenticate, ordersController.createOrder);
router.get('/', authenticate, ordersController.getOrders);
router.get('/:orderId/items', authenticate, ordersController.getOrderItems);

// 🔥 NEW: Table-specific order routes
router.get('/table/:table_id', authenticate, ordersController.getTableOrders);
router.get('/table/:table_id/active', authenticate, ordersController.getActiveTableOrders);

// 🔥 NEW: Session-specific order routes
router.get('/session/:sessionId', authenticate, ordersController.getSessionOrders);

module.exports = router;