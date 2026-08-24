const express = require('express');
const router = express.Router();
const printController = require('../Controllers/print.controller');

// Existing receipt print
router.post('/print', printController.printReceipt);

// NEW: Print sales report
router.post('/print-sales-report', printController.printSalesReport);

// NEW: Print audit logs report (remboursements + suppressions)
router.post('/print-audit-logs', printController.printAuditLogs);

// NEW: Manual / programmatic trigger for cash drawer
router.post('/open-drawer', async (req, res) => {
  try {
    const success = await printController.openDrawer();
    res.json({ success: true, opened: success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;