export const formatCount = (num) => {
  if (!num || num === null) return '0';

  const n = Number(num);
  console.log(n);
  if (n === 0) return '0';

  // Billions
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
  }
  // Millions
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  // Thousands
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }

  return n.toString();
};
