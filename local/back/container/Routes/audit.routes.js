const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  clearAuditLogs
} = require('../Controllers/audit.controller');

router.use(authenticate); // protect all
router.use(authenticate); // protect all
// No global admin check here, apply per-route

router.post('/', requireRole('admin'), createAuditLog); // create log manually (admin)
router.post('/log-deletion', createAuditLog); // log deletion (admin or worker)
router.get('/', requireRole('admin'), getAuditLogs); // get all logs, filterable
router.get('/:id', requireRole('admin'), getAuditLogById); // get log by id
router.delete('/', requireRole('admin'), clearAuditLogs); // clear all logs

module.exports = router;
