export const roleHome = (role) => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'HELPER') return '/helper';
  return '/user';
};