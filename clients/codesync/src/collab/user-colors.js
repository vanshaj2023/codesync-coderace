const PALETTE = [
  "#e5484d",
  "#f76808",
  "#30a46c",
  "#12a594",
  "#0091ff",
  "#3e63dd",
  "#8e4ec6",
  "#d6409f",
];

const SELECTION_ALPHA = "4d";

export const getUserColor = (username) => {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  const color = PALETTE[hash % PALETTE.length];
  return { color, colorLight: `${color}${SELECTION_ALPHA}` };
};
