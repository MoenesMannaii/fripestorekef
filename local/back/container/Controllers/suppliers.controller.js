// container/Controllers/suppliers.controller.js
const { Supplier, Facture } = require('../Models');
const { logAudit } = require('../utils/audit.utils');

async function createSupplier(req, res) {
  try {
    const supplier = await Supplier.create(req.body);
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'CREATE_SUPPLIER',
      details: `Fournisseur créé: ${supplier.name}`
    });
    res.status(201).json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSuppliers(req, res) {
  try {
    const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSupplierById(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [
        { model: Facture, limit: 10, order: [['facture_date', 'DESC']] }
      ]
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSupplier(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    await supplier.update(req.body);
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'UPDATE_SUPPLIER',
      details: `Fournisseur mis à jour: ${supplier.name}`
    });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSupplier(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    await supplier.destroy();
    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'DELETE_SUPPLIER',
      details: `Fournisseur supprimé: ${supplier.name}`
    });
    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
};
