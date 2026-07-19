const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Verifies the access token sent as `Authorization: Bearer <token>`.
 * On success, attaches the authenticated user to `req.user`.
 *
 * Deliberately does NOT touch the refresh token or DB sessions — access
 * tokens are stateless by design so this check stays cheap on every request.
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized — no access token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, 'Not authorized — invalid access token');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, 'Not authorized — user no longer exists');
  }

  req.user = user;
  next();
});

/**
 * Role-gate factory, e.g. `restrictTo('admin')`. Assumes `protect` ran first.
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = { protect, restrictTo };
