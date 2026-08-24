// container/Routes/promotions.routes.js
const express = require('express');
const router = express.Router();
const promotionsController = require('../Controllers/promotions.controller');
const protect = require('../middlewares/auth.middleware');

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Require Admin Role' });
  }
};

router.post('/', protect, adminOnly, promotionsController.createPromotion);
router.get('/', protect, promotionsController.listPromotions);
router.put('/:id', protect, adminOnly, promotionsController.updatePromotion);
router.delete('/:id', protect, adminOnly, promotionsController.deletePromotion);

module.exports = router;
