// Formatting utility helpers for Linkora

/**
 * Formats a number with comma separators (e.g. 24856 -> "24,856")
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString('en-US');
};

/**
 * Compact number formatter (e.g. 248000 -> "248K", 1200000 -> "1.2M")
 */
export const formatCompactNumber = (num) => {
  if (num === undefined || num === null) return '0';
  const val = Number(num);
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return val.toString();
};

/**
 * Formats percentage change with sign (e.g. 12.8 -> "+12.8%", -4.6 -> "-4.6%")
 */
export const formatPercentage = (val) => {
  if (val === undefined || val === null) return '0.0%';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

/**
 * Truncate long URLs or text with ellipsis
 */
export const truncateText = (text, maxLength = 32) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
