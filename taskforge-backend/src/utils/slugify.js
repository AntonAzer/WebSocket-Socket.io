const crypto = require('crypto');

/** Turns "Acme Corp" into "acme-corp". */
const slugifyBase = (text) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/**
 * Appends a short random suffix so two workspaces named "Acme" don't
 * collide on the unique `slug` index.
 */
const slugify = (text) => `${slugifyBase(text)}-${crypto.randomBytes(3).toString('hex')}`;

module.exports = { slugify };
