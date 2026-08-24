const { Product, ProductImage, Promotion } = require('../Models');
const { logAudit } = require('../utils/audit.utils');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// List Products - Only show non-deleted products
// List Products - Only show non-deleted products
// In your products.controller.js
async function listProducts(req, res) {
  try {
    const q = req.query.q || '';
    const barcode = req.query.barcode || '';

    let where = {};

    // If specific barcode query parameter is provided
    if (barcode) {
      where.barcode = barcode;
    }
    // If general search query is provided
    else if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { barcode: { [Op.like]: `%${q}%` } },
        { category: { [Op.like]: `%${q}%` } } // ADD THIS LINE
      ];
    }

    console.log('Search query:', { q, barcode, where });

    const products = await Product.findAll({
      where,
      include: [
        { model: ProductImage, as: 'ProductImages' },
        { model: Promotion, required: false }
      ],
      paranoid: true
    });

    console.log('Found products:', products.length);

    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
async function getProduct(req, res) {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        deleted_at: null // Only return if not deleted
      },
      include: [{ model: ProductImage, as: 'ProductImages' }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Create Product (with Image)
async function createProduct(req, res) {
  try {
    const { 
      name, price, stock, barcode, description, sku, cost_price, 
      category, has_sub_units, pieces_per_box, remise_percentage,
      parent_id, attributes, sell_by_weight, variants 
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      if (req.file) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
        });
      }
      return res.status(400).json({ message: 'Product name and price are required' });
    }

    const product = await Product.create({
      name,
      price: parseFloat(price),
      stock: parseFloat(stock) || 0,
      has_sub_units: has_sub_units === true || has_sub_units === 'true',
      pieces_per_box: parseInt(pieces_per_box) || 1,
      barcode,
      description,
      sku,
      cost_price: cost_price ? parseFloat(cost_price) : parseFloat(price),
      category,
      remise_percentage: parseFloat(remise_percentage) || 0,
      parent_id: parent_id || null,
      attributes: typeof attributes === 'string' ? JSON.parse(attributes) : (attributes || null),
      sell_by_weight: sell_by_weight === true || sell_by_weight === 'true'
    });

    // Handle variants if provided in the same request
    if (Array.isArray(variants) && variants.length > 0) {
      const variantsToCreate = variants.map(v => ({
        ...v,
        parent_id: product.id,
        category: product.category,
        sku: v.sku || `${product.sku}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }));
      await Product.bulkCreate(variantsToCreate);
    }

    // Handle image upload if present
    if (req.file) {
      const imageUrl = `/uploads/products/${req.file.filename}`;
      await ProductImage.create({
        product_id: product.id,
        url: imageUrl,
        is_primary: true,
      });
    }

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CREATE_PRODUCT',
      details: `Created product ${product.name}${variants ? ' with ' + variants.length + ' variants' : ''}`,
    });

    res.status(201).json({
      success: true,
      product,
      image: req.file ? {
        url: `/uploads/products/${req.file.filename}`,
        filename: req.file.filename
      } : null
    });

  } catch (err) {
    console.error('Error creating product:', err);
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
      });
    }
    res.status(500).json({ message: err.message });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    // Find product with images (only non-deleted products)
    const product = await Product.findOne({
      where: {
        id: id,
        deleted_at: null // Only allow updates on non-deleted products
      },
      include: ['ProductImages']
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Parse numeric fields
    const updateData = { ...req.body };
    if (updateData.price !== undefined && updateData.price !== '') updateData.price = parseFloat(updateData.price);
    if (updateData.stock !== undefined && updateData.stock !== '') updateData.stock = parseFloat(updateData.stock); // float for fractional stock
    if (updateData.cost_price !== undefined && updateData.cost_price !== '') updateData.cost_price = parseFloat(updateData.cost_price);
    if (updateData.has_sub_units !== undefined) updateData.has_sub_units = updateData.has_sub_units === true || updateData.has_sub_units === 'true';
    if (updateData.pieces_per_box) updateData.pieces_per_box = parseInt(updateData.pieces_per_box) || 1;
    if (updateData.remise_percentage !== undefined) updateData.remise_percentage = parseFloat(updateData.remise_percentage) || 0;

    // Handle empty SKU - don't update if empty to avoid unique constraint violation
    if (updateData.sku === '') {
      delete updateData.sku; // Remove SKU from update data if empty
    }

    // Handle image upload if file exists
    if (req.file) {
      console.log('New image uploaded:', req.file.filename);

      // Create the image URL - adjust this based on your server configuration
      const imageUrl = `/uploads/products/${req.file.filename}`;

      // Check if product already has images
      if (product.ProductImages && product.ProductImages.length > 0) {
        // Update the first image (or you might want to handle multiple images)
        await product.ProductImages[0].update({
          url: imageUrl,
          filename: req.file.filename
        });
      } else {
        // Create new image record
        await ProductImage.create({
          product_id: product.id,
          url: imageUrl,
          filename: req.file.filename,
          is_primary: true
        });
      }
    }

    // Update product data (only if there's data to update)
    if (Object.keys(updateData).length > 0) {
      await product.update(updateData);
    }

    // Reload product with updated images
    const updatedProduct = await Product.findByPk(product.id, {
      include: ['ProductImages']
    });

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_PRODUCT',
      details: `Updated product ${product.name}`,
    });

    res.json({
      success: true,
      product: updatedProduct
    });

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: err.message });
  }
}

// Soft Delete Product
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Method 1: Using Sequelize's destroy for soft delete
    await product.destroy(); // This will set deleted_at automatically

    // Method 2: Manual approach (if above doesn't work)
    // await product.update({ 
    //   deleted_at: new Date() 
    // });

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'DELETE_PRODUCT',
      details: `Soft deleted product ${product.name}`,
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 🆕 Helper to find product by scale code (assuming 5 or 6 digits)
async function getProductByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    let product = await Product.findOne({ 
      where: { barcode, deleted_at: null },
      include: [ProductImage] 
    });
    
    // If not found and looks like a scale barcode (starts with 20 and is 13 chars)
    if (!product && barcode.startsWith('20') && barcode.length === 13) {
      const itemCode = barcode.substring(2, 7); // Standard: 5 digits after prefix
      product = await Product.findOne({ 
        where: { barcode: itemCode, deleted_at: null },
        include: [ProductImage]
      });
      if (product) {
        // Extract weight in grams: indices 7 to 12
        const weightGrams = parseInt(barcode.substring(7, 12));
        return res.json({ 
          success: true, 
          product, 
          isScaleItem: true, 
          weight: weightGrams / 1000 // Convert to kg
        });
      }
    }

    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 🆕 Rename category globally
async function renameCategory(req, res) {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ message: 'Both oldName and newName are required' });
    }

    const [updatedCount] = await Product.update(
      { category: newName },
      { where: { category: oldName } }
    );

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'RENAME_CATEGORY',
      details: `Renamed category from "${oldName}" to "${newName}" for ${updatedCount} products`,
    });

    res.json({ success: true, message: `Renamed category for ${updatedCount} products`, updatedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductByBarcode, renameCategory };