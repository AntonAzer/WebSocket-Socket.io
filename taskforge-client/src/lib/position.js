const GAP = 1024;

/**
 * Mirrors `src/utils/position.js` on the backend. The client computes the
 * same "average of neighbours" position the server will persist, so the
 * optimistic UI update and the eventual DB state agree — no visible jump
 * once the server confirms the move.
 */
export function getPositionBetween(prevPos, nextPos) {
  const hasPrev = prevPos !== null && prevPos !== undefined;
  const hasNext = nextPos !== null && nextPos !== undefined;

  if (!hasPrev && !hasNext) return GAP;
  if (!hasPrev) return nextPos / 2;
  if (!hasNext) return prevPos + GAP;
  return (prevPos + nextPos) / 2;
}
