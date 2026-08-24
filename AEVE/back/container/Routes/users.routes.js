const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { 
  createWorker, 
  listWorkers, 
  updateWorker, 
  deleteWorker,
  getCurrentUser,
  updateCurrentUser,
  getAllUsers
} = require('../Controllers/users.controller');

router.use(authenticate);

// Current user routes (for profile management)
router.get('/me', getCurrentUser);
router.put('/me', updateCurrentUser);

// Worker management routes (admin only)
router.post('/workers', requireRole('admin'), createWorker);
router.get('/workers', listWorkers);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', requireRole('admin'), deleteWorker);
// Add this route
router.get('/',getAllUsers);

module.exports = router;