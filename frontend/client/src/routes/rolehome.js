export const roleHome = (role) => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'HELPER') return '/helper';
  if (role === 'SELLER') return '/seller';
  return '/user';
};