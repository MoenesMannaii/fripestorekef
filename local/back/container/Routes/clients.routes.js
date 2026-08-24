// container/Routes/clients.routes.js
const express = require('express');
const router = express.Router();
const { 
  createClient, 
  getClients, 
  getClientById, 
  updateClient, 
  deleteClient 
} = require('../Controllers/clients.controller');
const authenticate = require('../middlewares/auth.middleware');

router.post('/', authenticate, createClient);
router.get('/', authenticate, getClients);
router.get('/:id', authenticate, getClientById);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

module.exports = router;
