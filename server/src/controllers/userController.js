import bcrypt from 'bcryptjs';
import { User, Role } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, escapeRegex } from '../utils/helpers.js';
import { MODULES, ALL_PERMISSIONS } from '../config/permissions.js';
import { logAudit } from '../services/notificationService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (req.query.role) filter.role = req.query.role;
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.status) filter.status = req.query.status;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('role branch'),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(users, total, { page, limit }) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, extraPermissions, deniedPermissions, branch, allowedBranches, maxDiscountPercent, status } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest('Name, email, and password are required');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || undefined,
    extraPermissions: extraPermissions || [],
    deniedPermissions: deniedPermissions || [],
    branch: branch || undefined,
    allowedBranches: allowedBranches || [],
    maxDiscountPercent: maxDiscountPercent != null ? Number(maxDiscountPercent) : undefined,
    status: status || 'active',
  });

  await user.save();
  await logAudit({
    user: req.user,
    action: 'create_user',
    module: 'users',
    entityId: user._id,
    entityRef: user.email,
    description: `Created user ${user.name} (${user.email})`,
    req,
  });

  res.status(201).json({ success: true, message: 'User created successfully', data: { user } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, extraPermissions, deniedPermissions, branch, allowedBranches, maxDiscountPercent, status, password } = req.body;

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (user.isMasterAdmin && req.user._id.toString() !== user._id.toString()) {
    throw ApiError.forbidden('Master Admin can only be edited by themselves');
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role || undefined;
  if (extraPermissions !== undefined) user.extraPermissions = extraPermissions;
  if (deniedPermissions !== undefined) user.deniedPermissions = deniedPermissions;
  if (branch !== undefined) user.branch = branch || undefined;
  if (allowedBranches !== undefined) user.allowedBranches = allowedBranches;
  if (maxDiscountPercent !== undefined) user.maxDiscountPercent = maxDiscountPercent;
  if (status !== undefined) user.status = status;

  if (password && password.trim().length >= 8) {
    user.passwordHash = await bcrypt.hash(password, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();
  await logAudit({
    user: req.user,
    action: 'update_user',
    module: 'users',
    entityId: user._id,
    entityRef: user.email,
    description: `Updated user ${user.name}`,
    req,
  });

  res.json({ success: true, message: 'User updated successfully', data: { user } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.isMasterAdmin) throw ApiError.forbidden('Master Admin account cannot be deleted');
  if (user._id.toString() === req.user._id.toString()) throw ApiError.badRequest('You cannot delete your own account');

  await User.findByIdAndDelete(id);
  res.json({ success: true, message: 'User deleted successfully' });
});

export const getRoles = asyncHandler(async (_req, res) => {
  const roles = await Role.find().sort({ createdAt: 1 });
  res.json({ success: true, data: { roles } });
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions, maxDiscountPercent } = req.body;
  if (!name) throw ApiError.badRequest('Role name is required');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const role = new Role({
    name,
    slug,
    description,
    permissions: permissions || [],
    maxDiscountPercent: maxDiscountPercent != null ? Number(maxDiscountPercent) : 10,
  });

  await role.save();
  res.status(201).json({ success: true, message: 'Role created successfully', data: { role } });
});

export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, maxDiscountPercent, isActive } = req.body;

  const role = await Role.findById(id);
  if (!role) throw ApiError.notFound('Role not found');

  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;
  if (maxDiscountPercent !== undefined) role.maxDiscountPercent = Number(maxDiscountPercent);
  if (isActive !== undefined) role.isActive = isActive;

  await role.save();
  res.json({ success: true, message: 'Role updated successfully', data: { role } });
});

export const getPermissionsCatalog = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      modules: MODULES,
      allPermissions: ALL_PERMISSIONS,
    },
  });
});
