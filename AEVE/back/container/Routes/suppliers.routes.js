// container/Routes/suppliers.routes.js
const express = require('express');
const router = express.Router();
const { 
  createSupplier, 
  getSuppliers, 
  getSupplierById, 
  updateSupplier, 
  deleteSupplier 
} = require('../Controllers/suppliers.controller');
const authenticate = require('../middlewares/auth.middleware');

router.post('/', authenticate, createSupplier);
router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);
router.put('/:id', authenticate, updateSupplier);
router.delete('/:id', authenticate, deleteSupplier);

module.exports = router;
