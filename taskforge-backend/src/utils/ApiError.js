/**
 * A typed error carrying an HTTP status code, so controllers can just
 * `throw new ApiError(404, 'Board not found')` and let the central error
 * handler translate it into a consistent JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
