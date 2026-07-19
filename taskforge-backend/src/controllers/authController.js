const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  generateTokenPair,
  hashToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} = require('../utils/generateTokens');

const MAX_SESSIONS_PER_USER = 5; // simple cap so the sessions array can't grow unbounded

/** Throws a 400 with field-level details if express-validator found problems. */
const assertValidated = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array().map((e) => e.msg));
  }
};

/**
 * Persists a new refresh-token session on the user document, evicting the
 * oldest session first if the per-user cap has been reached (bounds
 * unbounded growth from a user who never explicitly logs out).
 */
const addSession = async (user, refreshTokenHash, req) => {
  const expiresAt = new Date(Date.now() + (Number(process.env.JWT_REFRESH_EXPIRES_IN_MS) || 7 * 24 * 60 * 60 * 1000));

  if (user.sessions.length >= MAX_SESSIONS_PER_USER) {
    user.sessions.shift();
  }

  user.sessions.push({
    tokenHash: refreshTokenHash,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.ip,
    expiresAt,
  });

  await user.save({ validateModifiedOnly: true });
};

/**
 * POST /api/v1/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  assertValidated(req);
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({ name, email, password });

  const { accessToken, refreshToken, refreshTokenHash } = generateTokenPair(user._id.toString());

  // Re-fetch with sessions selected since the schema hides it by default.
  const userWithSessions = await User.findById(user._id).select('+sessions');
  await addSession(userWithSessions, refreshTokenHash, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(201).json({
    success: true,
    accessToken,
    user,
  });
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  assertValidated(req);
  const { email, password } = req.body;

  // Explicitly select password since the schema hides it by default.
  const user = await User.findOne({ email }).select('+password +sessions');

  // Same error message for "no such user" and "wrong password" — this
  // prevents an attacker from using the endpoint to enumerate valid emails.
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken, refreshTokenHash } = generateTokenPair(user._id.toString());
  await addSession(user, refreshTokenHash, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(200).json({
    success: true,
    accessToken,
    user, // toJSON() strips password/sessions automatically
  });
});

/**
 * POST /api/v1/auth/refresh
 *
 * Implements refresh-token rotation: every refresh consumes the old
 * token and issues a brand new one. If a token is presented that matches
 * no stored session hash, it has either expired, been logged out, or is
 * being replayed by an attacker — in every case we reject it and force
 * re-authentication rather than silently issuing new tokens.
 */
const refresh = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!incomingToken) {
    throw new ApiError(401, 'No refresh token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    throw new ApiError(401, 'Refresh token invalid or expired — please log in again');
  }

  const user = await User.findById(decoded.sub).select('+sessions');
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  const incomingHash = hashToken(incomingToken);
  const sessionIndex = user.sessions.findIndex((s) => s.tokenHash === incomingHash);

  if (sessionIndex === -1) {
    // Token not found among active sessions — either already rotated out,
    // logged out, or a replayed/stolen token. Fail closed.
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    throw new ApiError(401, 'Session not recognized — please log in again');
  }

  // Rotate: drop the consumed session, issue + store a brand new one.
  user.sessions.splice(sessionIndex, 1);
  const { accessToken, refreshToken, refreshTokenHash } = generateTokenPair(user._id.toString());
  await addSession(user, refreshTokenHash, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(200).json({ success: true, accessToken });
});

/**
 * POST /api/v1/auth/logout
 * Invalidates only the current device's session (other logged-in devices
 * are unaffected), then clears the cookie.
 */
const logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (incomingToken) {
    try {
      const decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
      const incomingHash = hashToken(incomingToken);
      await User.findByIdAndUpdate(decoded.sub, {
        $pull: { sessions: { tokenHash: incomingHash } },
      });
    } catch (err) {
      // Token already invalid/expired — nothing to clean up server-side.
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user (requires `protect` middleware).
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = { signup, login, refresh, logout, getMe };
