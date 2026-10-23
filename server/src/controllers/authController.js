import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, AuditLog } from '../models/index.js';
import { config } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { computePermissions } from '../middleware/auth.js';
import { logAudit } from '../services/notificationService.js';

function signTokens(user) {
  const access = jwt.sign(
    { sub: user._id, type: 'access', tv: user.tokenVersion || 0 },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );

  const refresh = jwt.sign(
    { sub: user._id, type: 'refresh', tv: user.tokenVersion || 0 },
    config.jwt.refreshSecret,
    { expiresIn: `${config.jwt.refreshExpiresDays}d` }
  );

  return { access, refresh };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+passwordHash +tokenVersion +failedLoginCount +lockUntil')
    .populate('role branch');

  if (!user) throw ApiError.badRequest('Invalid email or password');

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.badRequest(`Account is temporarily locked. Try again in ${minLeft} minutes`);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    if (user.failedLoginCount >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    throw ApiError.badRequest('Invalid email or password');
  }

  if (user.status !== 'active') throw ApiError.badRequest('This account has been deactivated');

  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  await user.save();

  const tokens = signTokens(user);

  await logAudit({
    user,
    action: 'login',
    module: 'auth',
    description: `User ${user.name} logged in`,
    req,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isMasterAdmin: user.isMasterAdmin,
        role: user.role,
        branch: user.branch,
        permissions: Array.from(computePermissions(user)),
      },
      tokens,
    },
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('role branch');
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isMasterAdmin: user.isMasterAdmin,
        role: user.role,
        branch: user.branch,
        permissions: Array.from(computePermissions(user)),
      },
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  res.json({ success: true, message: 'Profile updated successfully', data: { user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw ApiError.badRequest('Both current and new password are required');
  if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters long');

  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw ApiError.badRequest('Incorrect current password');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate other active sessions
  user.passwordChangedAt = new Date();
  await user.save();

  await logAudit({
    user,
    action: 'change_password',
    module: 'auth',
    description: `User ${user.name} changed password`,
    req,
  });

  const tokens = signTokens(user);
  res.json({ success: true, message: 'Password changed successfully', data: { tokens } });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: rToken } = req.body;
  if (!rToken) throw ApiError.unauthorized('Refresh token required');

  let payload;
  try {
    payload = jwt.verify(rToken, config.jwt.refreshSecret);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion').populate('role');
  if (!user || user.status !== 'active') throw ApiError.unauthorized('User not found or inactive');
  if ((user.tokenVersion || 0) !== payload.tv) throw ApiError.unauthorized('Session has been revoked');

  const tokens = signTokens(user);
  res.json({ success: true, data: { tokens } });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
    await logAudit({
      user: req.user,
      action: 'logout',
      module: 'auth',
      description: `User ${req.user.name} logged out`,
      req,
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});
