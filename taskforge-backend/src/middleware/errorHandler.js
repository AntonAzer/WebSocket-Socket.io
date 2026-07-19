const ApiError = require('../utils/ApiError');

/** Catches requests to routes that don't exist and forwards a 404. */
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found — ${req.originalUrl}`));
};

/**
 * Central error handler. Normalizes Mongoose/JWT/validation errors into a
 * consistent { success, message, details } JSON shape, and only leaks
 * stack traces outside production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} '${err.keyValue[field]}' is already in use` : 'Duplicate value';
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  }

  if (process.env.NODE_ENV !== 'production' && !err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
