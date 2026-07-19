const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Signs a short-lived access token. This is sent in the response body and
 * kept in memory on the client (never localStorage) — it's attached as
 * `Authorization: Bearer <token>` on API requests.
 */
const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

/**
 * Signs a long-lived refresh token. This is sent ONLY as an httpOnly,
 * Secure, SameSite cookie — JavaScript on the client never sees it, which
 * closes off the main XSS token-theft vector.
 */
const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * We never store a raw refresh token in the DB. If the database were ever
 * dumped, raw tokens would let an attacker impersonate every logged-in
 * user. A one-way SHA-256 hash lets us verify a presented token without
 * being able to reconstruct it.
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Issues a fresh access/refresh pair and returns everything the caller
 * needs to (a) respond to the client and (b) persist the new session.
 */
const generateTokenPair = (userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken, refreshTokenHash: hashToken(refreshToken) };
};

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/api/v1/auth', // only sent to auth routes, minimizing exposure
  maxAge: Number(process.env.JWT_REFRESH_EXPIRES_IN_MS) || 7 * 24 * 60 * 60 * 1000,
});

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  generateTokenPair,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
};
