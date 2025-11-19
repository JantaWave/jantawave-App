export const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const getInitials = (first: string, last: string): string => {
  const firstInitial = capitalize(first)[0] || '';
  const lastInitial = capitalize(last)[0] || '';

  return `${firstInitial}${lastInitial}`;
};
