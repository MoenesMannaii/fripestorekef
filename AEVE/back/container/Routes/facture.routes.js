// routes/facture.routes.js
const express = require('express');
const router = express.Router();
const factureController = require('../Controllers/facture.controller');
const auth = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(auth);

// GET /api/factures - List all factures
router.get('/', factureController.listFactures);

// GET /api/factures/:id - Get single facture
router.get('/:id', factureController.getFacture);

// POST /api/factures - Create new facture
router.post('/', factureController.createFacture);

// PUT /api/factures/:id - Update facture
router.put('/:id', factureController.updateFacture);

// POST /api/factures/:id/confirm - Confirm facture and update stock
router.post('/:id/confirm', factureController.confirmFacture);

// POST /api/factures/:id/cancel - Cancel facture
router.post('/:id/cancel', factureController.cancelFacture);

module.exports = router;