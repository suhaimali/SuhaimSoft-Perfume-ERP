import { Branch, Warehouse } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const getBranches = asyncHandler(async (_req, res) => {
  const branches = await Branch.find().sort({ isDefault: -1, name: 1 });
  res.json({ success: true, data: { branches } });
});

export const createBranch = asyncHandler(async (req, res) => {
  const { name, code, type, address, phone, email, gstin, isDefault } = req.body;
  if (!name || !code) throw ApiError.badRequest('Branch name and code are required');

  if (isDefault) {
    await Branch.updateMany({}, { isDefault: false });
  }

  const branch = new Branch({
    name,
    code: code.trim().toUpperCase(),
    type: type || 'store',
    address,
    phone,
    email,
    gstin,
    isDefault: !!isDefault,
  });

  await branch.save();

  // Create default warehouse/store stock location for this branch
  const wh = new Warehouse({
    name: `${branch.name} Stock`,
    code: `${branch.code}-MAIN`,
    branch: branch._id,
    type: branch.type === 'warehouse' ? 'warehouse' : 'store',
    isDefault: true,
  });
  await wh.save();

  res.status(201).json({ success: true, message: 'Branch created successfully', data: { branch, warehouse: wh } });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.body.isDefault) {
    await Branch.updateMany({ _id: { $ne: id } }, { isDefault: false });
  }

  const branch = await Branch.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!branch) throw ApiError.notFound('Branch not found');

  res.json({ success: true, message: 'Branch updated successfully', data: { branch } });
});

export const getWarehouses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.branch) filter.branch = req.query.branch;

  const warehouses = await Warehouse.find(filter).sort({ isDefault: -1, name: 1 }).populate('branch');
  res.json({ success: true, data: { warehouses } });
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, branch, type, address, isDefault } = req.body;
  if (!name || !code || !branch) throw ApiError.badRequest('Name, code, and branch are required');

  if (isDefault) {
    await Warehouse.updateMany({ branch }, { isDefault: false });
  }

  const wh = new Warehouse({
    name,
    code: code.trim().toUpperCase(),
    branch,
    type: type || 'store',
    address,
    isDefault: !!isDefault,
  });

  await wh.save();
  res.status(201).json({ success: true, message: 'Warehouse created successfully', data: { warehouse: wh } });
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const wh = await Warehouse.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!wh) throw ApiError.notFound('Warehouse not found');

  res.json({ success: true, message: 'Warehouse updated successfully', data: { warehouse: wh } });
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const branch = await Branch.findById(id);
  if (!branch) throw ApiError.notFound('Branch not found');
  if (branch.isDefault) throw ApiError.badRequest('Cannot delete default flagship showroom branch');

  await Warehouse.deleteMany({ branch: id });
  await Branch.findByIdAndDelete(id);
  res.json({ success: true, message: 'Branch and associated warehouses deleted' });
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const wh = await Warehouse.findById(id);
  if (!wh) throw ApiError.notFound('Warehouse not found');
  if (wh.isDefault) throw ApiError.badRequest('Cannot delete default warehouse for branch');

  await Warehouse.findByIdAndDelete(id);
  res.json({ success: true, message: 'Warehouse deleted' });
});
