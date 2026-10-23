// Money helpers: all arithmetic is done in paise (integer) and returned in rupees with 2 decimals.
export const toPaise = (n) => Math.round((Number(n) || 0) * 100);
export const fromPaise = (p) => Math.round(p) / 100;
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parsePagination(query, { defaultLimit = 20, maxLimit = 200 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function parseSort(sortStr, allowed = [], fallback = '-createdAt') {
  const s = String(sortStr || fallback);
  const field = s.replace(/^-/, '');
  if (allowed.length && !allowed.includes(field)) return fallback;
  return s;
}

export function dateRange(query, field = 'createdAt') {
  const f = {};
  if (query.from) f.$gte = startOfDay(new Date(query.from));
  if (query.to) f.$lte = endOfDay(new Date(query.to));
  return Object.keys(f).length ? { [field]: f } : {};
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const paged = (items, total, { page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
});
