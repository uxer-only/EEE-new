/** True while the profile's VIP option is active. */
export function isVip(p) {
  if (typeof p.vip_active === 'boolean') return p.vip_active;
  return !!(p.vip_until && new Date(p.vip_until) > new Date());
}
