const express = require('express');
const router = express.Router();
const statsController = require('../Controllers/stats.controller');

// Get product statistics with filters
router.get('/products', statsController.getProductStats);

// Get available categories
router.get('/categories', statsController.getCategories);

// Get product suggestions for autocomplete
router.get('/suggestions', statsController.getProductSuggestions);

// Get all products and categories for filter modal
router.get('/all-products-categories', statsController.getAllProductsAndCategories);

// NEW: Get detailed sales report for printing
router.get('/detailed-report', statsController.getDetailedSalesReport);

module.exports = router;