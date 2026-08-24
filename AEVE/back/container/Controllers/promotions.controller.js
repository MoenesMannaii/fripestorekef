// container/Controllers/promotions.controller.js
const { Promotion, PromotionBundleItem, PromotionPrincipalItem, Product, ProductImage } = require('../Models');
const { logAudit } = require('../utils/audit.utils');

async function createPromotion(req, res) {
  try {
    const { name, type, product_id, is_active, bundle_items, principal_items, remise_percentage } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (type === 'percentage' && !product_id) {
      return res.status(400).json({ message: 'Main product is required for percentage promotions' });
    }

    const promotion = await Promotion.create({
      name,
      type,
      product_id: type === 'percentage' ? product_id : null,
      is_active: is_active !== undefined ? is_active : true
    });

    if (type === 'percentage' && remise_percentage) {
      await Product.update(
        { remise_percentage: is_active !== false ? parseFloat(remise_percentage) : 0 }, 
        { where: { id: product_id } }
      );
    }

    if (type === 'bundle') {
      // Principal items
      if (Array.isArray(principal_items) && principal_items.length > 0) {
        const pItemsToCreate = principal_items.map(item => ({
          promotion_id: promotion.id,
          product_id: item.product_id,
          quantity: item.quantity || 1
        }));
        await PromotionPrincipalItem.bulkCreate(pItemsToCreate);
      }

      // Free items
      if (Array.isArray(bundle_items) && bundle_items.length > 0) {
        const itemsToCreate = bundle_items.map(item => ({
          promotion_id: promotion.id,
          product_id: item.product_id || item.free_product_id,
          quantity: item.quantity || 1
        }));
        await PromotionBundleItem.bulkCreate(itemsToCreate);
      }
    }

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CREATE_PROMOTION',
      details: `Created promotion ${promotion.name} (${type})`,
    });

    res.status(201).json({ success: true, promotion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function listPromotions(req, res) {
  try {
    const promotions = await Promotion.findAll({
      include: [
        { model: Product, as: 'MainProduct' },
        { 
          model: PromotionPrincipalItem, 
          as: 'PrincipalItems',
          include: [{ model: Product, as: 'Product' }]
        },
        { 
          model: PromotionBundleItem, 
          as: 'BundleItems',
          include: [{ model: Product, as: 'FreeProduct' }]
        }
      ]
    });
    res.json({ success: true, promotions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deletePromotion(req, res) {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Delete associated items first
    await PromotionPrincipalItem.destroy({ where: { promotion_id: id } });
    await PromotionBundleItem.destroy({ where: { promotion_id: id } });
    
    // Clear product remise if it was a percentage promotion
    if (promotion.type === 'percentage') {
      await Product.update({ remise_percentage: 0 }, { where: { id: promotion.product_id } });
    }

    await promotion.destroy();

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'DELETE_PROMOTION',
      details: `Deleted promotion ${promotion.name}`,
    });

    res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updatePromotion(req, res) {
  try {
    const { id } = req.params;
    const { name, type, product_id, is_active, bundle_items, principal_items, remise_percentage } = req.body;

    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const updatedIsActive = is_active !== undefined ? is_active : promotion.is_active;

    await promotion.update({
      name: name || promotion.name,
      type: type || promotion.type,
      product_id: type === 'percentage' ? (product_id || promotion.product_id) : null,
      is_active: updatedIsActive
    });

    if (type === 'percentage' && remise_percentage !== undefined) {
      await Product.update(
        { remise_percentage: updatedIsActive ? parseFloat(remise_percentage) : 0 }, 
        { where: { id: product_id || promotion.product_id } }
      );
    }

    if (type === 'bundle') {
      // Update Principal items
      if (Array.isArray(principal_items)) {
        await PromotionPrincipalItem.destroy({ where: { promotion_id: id } });
        if (principal_items.length > 0) {
          const pItemsToCreate = principal_items.map(item => ({
            promotion_id: promotion.id,
            product_id: item.product_id,
            quantity: item.quantity || 1
          }));
          await PromotionPrincipalItem.bulkCreate(pItemsToCreate);
        }
      }

      // Update Free items
      if (Array.isArray(bundle_items)) {
        await PromotionBundleItem.destroy({ where: { promotion_id: id } });
        if (bundle_items.length > 0) {
          const itemsToCreate = bundle_items.map(item => ({
            promotion_id: promotion.id,
            product_id: item.product_id || item.free_product_id,
            quantity: item.quantity || 1
          }));
          await PromotionBundleItem.bulkCreate(itemsToCreate);
        }
      }
    }

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_PROMOTION',
      details: `Updated promotion ${promotion.name}`,
    });

    res.json({ success: true, promotion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createPromotion,
  listPromotions,
  deletePromotion,
  updatePromotion
};
