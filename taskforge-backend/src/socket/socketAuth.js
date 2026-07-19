const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Runs once per socket connection attempt, before `connection` fires.
 * The client sends its in-memory access token as `socket.handshake.auth.token`
 * — the same token used for `Authorization: Bearer` on REST calls, so
 * there's exactly one access-token verification path in the whole app.
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(new Error('Authentication error: user no longer exists'));
    }

    socket.user = user;
    next();
  } catch (err) {
    // Covers both an expired access token and a malformed one — either
    // way the client should refresh via REST and reconnect with a fresh
    // token (see the frontend socket hook).
    next(new Error('Authentication error: invalid or expired token'));
  }
};

module.exports = socketAuth;
