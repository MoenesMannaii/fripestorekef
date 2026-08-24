// container/Routes/credit.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { createCreditSale, getCreditSales, getCreditSaleById, registerPayment, payAllClientCredits } = require('../Controllers/credit.controller');

router.post('/', authenticate, createCreditSale);
router.get('/', authenticate, getCreditSales);
router.get('/:id', authenticate, getCreditSaleById);
router.patch('/:id/pay', authenticate, registerPayment);
router.patch('/client/:name/pay-all', authenticate, payAllClientCredits);

module.exports = router;
