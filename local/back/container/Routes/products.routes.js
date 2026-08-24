const express = require('express');
const router = express.Router();
const productsController = require('../Controllers/products.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { Product } = require('../Models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for product uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Add a fast custom route for the Low Stock Notification Bell Before the generic /:id route
router.get('/notifications/low-stock', authMiddleware, async (req, res) => {
  try {
    const lowStockProducts = await Product.findAll({
      where: {
        stock: { [Op.lte]: 10 },
        deleted_at: null
      },
      attributes: ['id', 'name', 'stock', 'has_sub_units', 'pieces_per_box'],
      order: [['stock', 'ASC']] // lowest first
    });
    res.json({ success: true, count: lowStockProducts.length, data: lowStockProducts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch low stock alerts' });
  }
});

// Create product
router.post('/', authMiddleware, upload.single('productImage'), productsController.createProduct);

// List products
router.get('/', authMiddleware, productsController.listProducts);

// 🆕 Search by barcode (handles scale barcodes)
router.get('/barcode/:barcode', authMiddleware, productsController.getProductByBarcode);

// Get single product
router.get('/:id', authMiddleware, productsController.getProduct);

// Update product
router.put('/:id', authMiddleware, upload.single('productImage'), productsController.updateProduct);

// Rename category
router.put('/categories/rename', authMiddleware, productsController.renameCategory);

// Delete product
router.delete('/:id', authMiddleware, productsController.deleteProduct);

module.exports = router;