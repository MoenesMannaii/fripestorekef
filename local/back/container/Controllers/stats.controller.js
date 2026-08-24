const statsService = require('../services/stats.service');

class StatsController {
  /**
   * Get product statistics
   */
  async getProductStats(req, res) {
    try {
      const { startDate, endDate, category, productName, cashierId, shiftId } = req.query;
      console.log('Stats request query:', { startDate, endDate, category, productName, cashierId, shiftId });
      
      // Validate required parameters - dates are required UNLESS shiftId is provided
      if (!shiftId && (!startDate || !endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required unless a shift is selected'
        });
      }

      const filters = {
        startDate,
        endDate,
        shiftId: shiftId || null,
        category: category || null,
        productName: productName || null,
        cashierId: cashierId || null
      };

      // Use the main method (raw SQL)
      const stats = await statsService.getProductStats(filters);
      console.log('Stats result:', stats);

      // ✅ FIXED: Correct response structure with "data" key
      res.json({
        success: true,
        data: stats  // ← CRITICAL FIX: was " stats" (with space) before
      });
    } catch (error) {
      console.error('Stats controller error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  

  /**
   * Get detailed sales report for printing
   */
  async getDetailedSalesReport(req, res) {
    try {
      const { startDate, endDate, category, productName, cashierId, shiftId } = req.query;
      console.log('Detailed report request:', { startDate, endDate, category, productName, cashierId, shiftId });

      // Validate required parameters
      if (!shiftId && (!startDate || !endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required unless a shift is selected'
        });
      }

      const filters = {
        startDate,
        endDate,
        shiftId: shiftId || null,
        category: category || null,
        productName: productName || null,
        cashierId: cashierId || null
      };

      // Call service to get detailed report
      const report = await statsService.getDetailedSalesReport(filters);
      console.log('Detailed report result:', report);

      // ✅ FIXED: Correct response structure with "data" key
      res.json({
        success: true,
        data: report  // ← CRITICAL FIX: was " report" (with space) before
      });
    } catch (error) {
      console.error('Detailed report controller error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get available categories
   */
  async getCategories(req, res) {
    try {
      const categories = await statsService.getCategories();
      // ✅ FIXED: Consistent response structure
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Categories controller error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get product suggestions for autocomplete
   */
  async getProductSuggestions(req, res) {
    try {
      const { search } = req.query;
      if (!search || search.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const suggestions = await statsService.getProductSuggestions(search);
      // ✅ FIXED: Consistent response structure
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Suggestions controller error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get all products and categories for filter modal
   */
  async getAllProductsAndCategories(req, res) {
    try {
      const data = await statsService.getAllProductsAndCategories();
      // ✅ This is correct - spreading products and categories directly
      res.json({
        success: true,
        ...data
      });
    } catch (error) {
      console.error('Get all products and categories error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new StatsController();