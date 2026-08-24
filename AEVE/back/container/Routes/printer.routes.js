const express = require('express');
const router = express.Router();
const PrinterController = require('../Controllers/printer.controller');

// Add these routes:
router.get('/', PrinterController.getAllPrinters);
router.get('/stats', PrinterController.getPrinterStats);
router.get('/scan', PrinterController.scanNetwork);
router.get('/test/:id', PrinterController.testPrinter);

// Quick test routes (no authentication needed for testing)
router.get('/test-quick', PrinterController.testPrinterQuick);
router.get('/test-print-simple', PrinterController.testPrintSimple);

router.post('/', PrinterController.createPrinter);
router.post('/from-scan', PrinterController.addPrinterFromScan);

router.put('/:id', PrinterController.updatePrinter);
router.delete('/:id', PrinterController.deletePrinter);

module.exports = router;