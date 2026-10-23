import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { ALL_PERMISSIONS } from '../config/permissions.js';

export function computePermissions(user) {
  if (user.isMasterAdmin) return new Set(ALL_PERMISSIONS);
  const set = new Set(user.role && user.role.isActive !== false ? user.role.permissions || [] : []);
  (user.extraPermissions || []).forEach((p) => set.add(p));
  (user.deniedPermissions || []).forEach((p) => set.delete(p));
  return set;
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.accessSecret);
  } catch (e) {
    throw new ApiError(401, e.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token');
  }
  if (payload.type !== 'access') throw ApiError.unauthorized('Invalid token');

  const user = await User.findById(payload.sub).select('+tokenVersion').populate('role');
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account is inactive or does not exist');
  // Logout / password change bumps tokenVersion and revokes all outstanding tokens.
  if ((user.tokenVersion || 0) !== payload.tv) throw new ApiError(401, 'Session has been revoked');

  req.user = user;
  req.permissions = computePermissions(user);
  next();
});

export const can = (req, perm) => !!req.user && (req.user.isMasterAdmin || req.permissions.has(perm));

/** Require ANY of the listed permissions. */
export const requirePermission = (...perms) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (perms.some((p) => can(req, p))) return next();
  next(ApiError.forbidden(`Missing permission: ${perms.join(' or ')}`));
};

export const requireMasterAdmin = (req, _res, next) => {
  if (req.user?.isMasterAdmin) return next();
  next(ApiError.forbidden('Administrator access required'));
};

/** Mongo filter restricting records to the branches a staff user may access. */
export function branchScope(req, field = 'branch') {
  const u = req.user;
  if (!u || u.isMasterAdmin) return {};
  const allowed = [...(u.allowedBranches || [])];
  if (u.branch) allowed.push(u.branch);
  if (!allowed.length) return {};
  return { [field]: { $in: allowed } };
}

/** Throws if a staff user tries to act on a branch outside their scope. */
export function assertBranchAccess(req, branchId) {
  const scope = branchScope(req);
  if (!scope.branch || !branchId) return;
  if (!scope.branch.$in.some((b) => String(b) === String(branchId))) {
    throw ApiError.forbidden('You do not have access to this branch');
  }
}
