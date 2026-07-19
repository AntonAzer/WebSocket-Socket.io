const GAP = 1024;

/**
 * Fractional indexing: instead of storing 0,1,2,3... and re-numbering every
 * sibling on a reorder, we store spaced-out floats (1024, 2048, 3072...).
 * Dropping a card between two others just needs the average of their
 * positions — a single-document write, no matter how many cards exist.
 *
 * @param {number|null|undefined} prevPos position of the item before the drop point
 * @param {number|null|undefined} nextPos position of the item after the drop point
 */
const getPositionBetween = (prevPos, nextPos) => {
  const hasPrev = prevPos !== null && prevPos !== undefined;
  const hasNext = nextPos !== null && nextPos !== undefined;

  if (!hasPrev && !hasNext) return GAP; // first item in an empty list
  if (!hasPrev) return nextPos / 2; // dropped at the very start
  if (!hasNext) return prevPos + GAP; // dropped at the very end
  return (prevPos + nextPos) / 2; // dropped between two items
};

/** Position for a brand-new item appended to the end of a list. */
const getNextPosition = (lastPos) => (lastPos === null || lastPos === undefined ? GAP : lastPos + GAP);

module.exports = { getPositionBetween, getNextPosition, GAP };
