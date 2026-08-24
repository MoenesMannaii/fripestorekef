const { query, validationResult } = require('express-validator');

const validateOrderQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
  
  query('status')
    .optional()
    .isIn(['Tous', 'Terminée', 'Annulée', 'En cours'])
    .withMessage('Invalid status value'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('format')
    .optional()
    .isIn(['csv', 'pdf'])
    .withMessage('Format must be csv or pdf'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateOrderQuery
};