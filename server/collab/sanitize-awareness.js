const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const FALLBACK_COLOR = '#30bced';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isId = (value) =>
  isPlainObject(value) && Number.isSafeInteger(value.client) && Number.isSafeInteger(value.clock);

const isRelativePosition = (value) =>
  isPlainObject(value) && (isId(value.item) || isId(value.type) || typeof value.tname === 'string');

/**
 * Awareness state is rendered into other users' editors: colors end up in style
 * attributes and a malformed cursor throws inside the remote selection plugin.
 * Only a fixed shape is relayed, and the display name is always the joined username.
 */
const sanitizeAwarenessState = (state, username) => {
  if (!isPlainObject(state)) return null;

  const color = HEX_COLOR.test(state.user?.color) ? state.user.color : FALLBACK_COLOR;
  const colorLight = HEX_COLOR.test(state.user?.colorLight)
    ? state.user.colorLight
    : `${color}33`;
  const sanitized = { user: { name: username, color, colorLight } };

  const { cursor } = state;
  if (isPlainObject(cursor) && isRelativePosition(cursor.anchor) && isRelativePosition(cursor.head)) {
    sanitized.cursor = { anchor: cursor.anchor, head: cursor.head };
  }
  return sanitized;
};

module.exports = { sanitizeAwarenessState };
