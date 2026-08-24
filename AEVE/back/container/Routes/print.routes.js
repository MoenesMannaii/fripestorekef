const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Import each function individually
const printController = require('../Controllers/print.controller');
const authenticate = require('../middlewares/auth.middleware');

// Protect all routes
router.use(authenticate);

// ========== PRODUCT BREAKDOWN PRINTING ==========
router.post('/product-breakdown', printController.printProductBreakdown);
router.get('/download/product-report/:filename', printController.downloadProductReportPDF);

// ========== ORDER PRINTING ROUTES ==========

// Generate PDF receipts (original function)
router.post('/order/:orderId', printController.printOrder);

// Direct printing (no PDF)
router.get('/order/:orderId/direct', printController.printOrderDirect);

// ========== PRINTER MANAGEMENT ==========

// Get print options for an order
router.get('/options/:orderId', printController.getPrintOptions);

// Test printer connection (uses new simple test)
router.get('/test', printController.testPrinter);

// Simple test print
// router.get('/test-print-simple'); // route without handler — disabled

// Get printer status
router.get('/status', printController.getPrinterStatus);

// ========== SESSION PRINTING ==========

// Direct session summary print
router.post('/session-summary/:tableId', printController.printSessionSummaryDirect);

module.exports = router;