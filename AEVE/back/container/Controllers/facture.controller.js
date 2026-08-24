// controllers/facture.controller.js
const { Facture, FactureItem, Product, ProductImage, User, sequelize } = require('../Models'); // Add sequelize here
const { logAudit } = require('../utils/audit.utils');
const { Op } = require('sequelize');

// Generate unique facture number
function generateFactureNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `FACT-${timestamp}-${random}`;
}

// List all factures
async function listFactures(req, res) {
  try {
    const { status, supplier, facture_number, start_date, end_date, sort = 'created_at', order = 'DESC' } = req.query;

    let where = {};

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by supplier name
    if (supplier) {
      where.supplier_name = { [Op.like]: `%${supplier}%` };
    }

    // Filter by facture number
    if (facture_number) {
      where.facture_number = { [Op.like]: `%${facture_number}%` };
    }

    // Filter by date range
    if (start_date && end_date) {
      where.facture_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'facture_date', 'total_amount', 'facture_number', 'supplier_name'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';

    // Validate order
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const factures = await Facture.findAll({
      where,
      include: [
        {
          model: FactureItem,
          include: [{
            model: Product,
            include: [{ model: ProductImage, as: 'ProductImages' }]
          }]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sortField, sortOrder]]
    });

    res.json({ factures });
  } catch (err) {
    console.error('Error listing factures:', err);
    res.status(500).json({ message: err.message });
  }
}

// Get single facture
async function getFacture(req, res) {
  try {
    const facture = await Facture.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: FactureItem,
          include: [{
            model: Product,
            include: [{ model: ProductImage, as: 'ProductImages' }]
          }]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'] // Changed from 'username' to 'name'
        }
      ]
    });

    if (!facture) {
      return res.status(404).json({ message: 'Facture not found' });
    }

    res.json({ facture });
  } catch (err) {
    console.error('Error getting facture:', err);
    res.status(500).json({ message: err.message });
  }
}

// Create new facture
async function createFacture(req, res) {
  const transaction = await sequelize.transaction(); // Now sequelize is defined

  try {
    const { supplier_name, supplier_info, supplier_phone, supplier_email, supplier_address, facture_date, comment, items } = req.body;

    // Validate required fields
    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier name and items are required' });
    }

    // Calculate total amount
    const total_amount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_cost) * parseInt(item.quantity));
    }, 0);

    // Create facture
    const facture = await Facture.create({
      facture_number: generateFactureNumber(),
      supplier_name,
      supplier_info,
      supplier_phone: supplier_phone || null,
      supplier_email: supplier_email || null,
      supplier_address: supplier_address || null,
      facture_date: facture_date || new Date(),
      total_amount,
      comment,
      status: 'draft',
      created_by: req.user.id
    }, { transaction });

    // Create facture items
    for (const item of items) {
      await FactureItem.create({
        facture_id: facture.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.unit_cost * item.quantity
      }, { transaction });
    }

    await transaction.commit();

    // Log audit
    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CREATE_FACTURE',
      details: `Created facture ${facture.facture_number} for supplier ${supplier_name}`,
    });

    // Fetch complete facture with items
    const createdFacture = await Facture.findByPk(facture.id, {
      include: [
        {
          model: FactureItem,
          include: [{
            model: Product,
            include: [{ model: ProductImage, as: 'ProductImages' }]
          }]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'] // Changed from 'username' to 'name'
        }
      ]
    });

    res.status(201).json({
      success: true,
      facture: createdFacture
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error creating facture:', err);
    res.status(500).json({ message: err.message });
  }
}

// Confirm facture and update stock
async function confirmFacture(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const facture = await Facture.findOne({
      where: { id, status: 'draft' },
      include: [{
        model: FactureItem
      }]
    });

    if (!facture) {
      return res.status(404).json({ message: 'Draft facture not found' });
    }

    // Update product stock for each item
    for (const item of facture.FactureItems) {
      const product = await Product.findByPk(item.product_id, { transaction });

      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      // Update stock
      await product.update({
        stock: product.stock + item.quantity
      }, { transaction });

      console.log(`Updated stock for product ${product.name}: +${item.quantity} units`);
    }

    // Update facture status to confirmed
    await facture.update({
      status: 'confirmed',
      updated_at: new Date()
    }, { transaction });

    await transaction.commit();

    // Log audit
    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CONFIRM_FACTURE',
      details: `Confirmed facture ${facture.facture_number} and updated stock`,
    });

    res.json({
      success: true,
      message: 'Facture confirmed and stock updated successfully',
      facture
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error confirming facture:', err);
    res.status(500).json({ message: err.message });
  }
}

// Update facture (only draft factures can be updated)
async function updateFacture(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { supplier_name, supplier_info, supplier_phone, supplier_email, supplier_address, facture_date, comment, items } = req.body;

    const facture = await Facture.findOne({
      where: { id, status: 'draft' },
      include: [{
        model: FactureItem
      }]
    });

    if (!facture) {
      return res.status(404).json({ message: 'Draft facture not found' });
    }

    // Calculate new total amount if items are provided
    let total_amount = facture.total_amount;
    if (items) {
      total_amount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.unit_cost) * parseInt(item.quantity));
      }, 0);
    }

    // Update facture
    await facture.update({
      supplier_name: supplier_name || facture.supplier_name,
      supplier_info: supplier_info || facture.supplier_info,
      supplier_phone: supplier_phone !== undefined ? supplier_phone : facture.supplier_phone,
      supplier_email: supplier_email !== undefined ? supplier_email : facture.supplier_email,
      supplier_address: supplier_address !== undefined ? supplier_address : facture.supplier_address,
      facture_date: facture_date || facture.facture_date,
      comment: comment || facture.comment,
      total_amount,
      updated_at: new Date()
    }, { transaction });

    // Update items if provided
    if (items) {
      // Remove existing items
      await FactureItem.destroy({
        where: { facture_id: facture.id },
        transaction
      });

      // Create new items
      for (const item of items) {
        await FactureItem.create({
          facture_id: facture.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.unit_cost * item.quantity
        }, { transaction });
      }
    }

    await transaction.commit();

    // Log audit
    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_FACTURE',
      details: `Updated facture ${facture.facture_number}`,
    });

    // Fetch updated facture
    const updatedFacture = await Facture.findByPk(facture.id, {
      include: [
        {
          model: FactureItem,
          include: [{
            model: Product,
            include: [{ model: ProductImage, as: 'ProductImages' }]
          }]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'] // Changed from 'username' to 'name'
        }
      ]
    });

    res.json({
      success: true,
      facture: updatedFacture
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error updating facture:', err);
    res.status(500).json({ message: err.message });
  }
}

// Cancel facture
async function cancelFacture(req, res) {
  try {
    const { id } = req.params;

    const facture = await Facture.findByPk(id);

    if (!facture) {
      return res.status(404).json({ message: 'Facture not found' });
    }

    // Only allow cancelling draft factures
    if (facture.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft factures can be cancelled' });
    }

    await facture.update({
      status: 'cancelled',
      updated_at: new Date()
    });

    // Log audit
    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CANCEL_FACTURE',
      details: `Cancelled facture ${facture.facture_number}`,
    });

    res.json({
      success: true,
      message: 'Facture cancelled successfully'
    });

  } catch (err) {
    console.error('Error cancelling facture:', err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  listFactures,
  getFacture,
  createFacture,
  confirmFacture,
  updateFacture,
  cancelFacture
};