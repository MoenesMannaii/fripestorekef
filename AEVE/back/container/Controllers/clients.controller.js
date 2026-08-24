// container/Controllers/clients.controller.js
const { Client, Order, CreditSale } = require('../Models');
const { logAudit } = require('../utils/audit.utils');

async function createClient(req, res) {
  try {
    const client = await Client.create(req.body);
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'CREATE_CLIENT',
      details: `Client créé: ${client.name}`
    });
    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getClients(req, res) {
  try {
    const clients = await Client.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getClientById(req, res) {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [
        { model: Order, limit: 10, order: [['created_at', 'DESC']] },
        { model: CreditSale, limit: 10, order: [['created_at', 'DESC']] }
      ]
    });
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateClient(req, res) {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable' });
    await client.update(req.body);
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'UPDATE_CLIENT',
      details: `Client mis à jour: ${client.name}`
    });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteClient(req, res) {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable' });
    await client.destroy();
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'DELETE_CLIENT',
      details: `Client supprimé: ${client.name}`
    });
    res.json({ success: true, message: 'Client supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
};
