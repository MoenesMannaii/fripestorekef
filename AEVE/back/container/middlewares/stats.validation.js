const { query, validationResult } = require('express-validator');

const validateStatsQuery = [
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('category')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Category must be a non-empty string'),
  
  query('productName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 }) // Changed from 2 to 1 to allow single character searches
    .withMessage('Product name must be at least 1 character long'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    // Auto-set endDate to startDate if not provided (single day)
    if (req.query.startDate && !req.query.endDate) {
      req.query.endDate = req.query.startDate;
    }
    
    next();
  }
];

module.exports = {
  validateStatsQuery
};