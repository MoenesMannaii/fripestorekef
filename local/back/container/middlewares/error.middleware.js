const logger = require('../utils/logger.utils');

function errorHandler(err, req, res, next) {
  // Log the error securely using winston
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { stack: err.stack });

  // Send a sanitized message to the client, hiding stack traces
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Une erreur interne est survenue. Veuillez contacter le support.' : err.message
  });
}
module.exports = errorHandler;
