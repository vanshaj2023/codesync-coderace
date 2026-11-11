import { COLORS } from '../theme/colors.js';

export const parseMaybeJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const getDifficultyStyles = (diff) => {
  if (diff === 'easy') return { color: COLORS.success, bg: '#2cbb5d15', border: '#2cbb5d40' };
  if (diff === 'medium' || diff === 'med') return { color: COLORS.warning, bg: '#ffc10715', border: '#ffc10740' };
  if (diff === 'hard') return { color: COLORS.fail, bg: '#ef474315', border: '#ef474340' };
  return { color: COLORS.textMuted, bg: '#222', border: '#333' };
};

export const cleanProblemDescription = (description) =>
  description?.replace(/Example \d+:/gi, '')?.replace(/Constraints:/gi, '')?.trim() || '';

export const getInitialLanguage = (snippets) => {
  if (snippets.cpp) return 'cpp';
  if (snippets.java) return 'java';
  return 'python';
};