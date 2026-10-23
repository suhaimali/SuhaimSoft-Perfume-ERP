import { Brand, Category } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, escapeRegex } from '../utils/helpers.js';

// BRANDS
export const getBrands = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100 });
  const filter = {};

  if (req.query.search) {
    filter.name = new RegExp(escapeRegex(req.query.search), 'i');
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const [brands, total] = await Promise.all([
    Brand.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Brand.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(brands, total, { page, limit }) });
});

export const createBrand = asyncHandler(async (req, res) => {
  const { name, country, website, description, logo } = req.body;
  if (!name) throw ApiError.badRequest('Brand name is required');

  const brand = new Brand({ name, country, website, description, logo });
  await brand.save();

  res.status(201).json({ success: true, message: 'Brand created successfully', data: { brand } });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const brand = await Brand.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!brand) throw ApiError.notFound('Brand not found');

  res.json({ success: true, message: 'Brand updated successfully', data: { brand } });
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Soft delete / archive
  const brand = await Brand.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!brand) throw ApiError.notFound('Brand not found');

  res.json({ success: true, message: 'Brand archived successfully', data: { brand } });
});

// CATEGORIES & ATTRIBUTES
export const getCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), 'i');
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, type, value, description, parent, sortOrder } = req.body;
  if (!name || !type) throw ApiError.badRequest('Category name and type are required');

  const cat = new Category({ name, type, value, description, parent, sortOrder: Number(sortOrder) || 0 });
  await cat.save();

  res.status(201).json({ success: true, message: 'Category created successfully', data: { category: cat } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cat = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!cat) throw ApiError.notFound('Category not found');

  res.json({ success: true, message: 'Category updated successfully', data: { category: cat } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cat = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!cat) throw ApiError.notFound('Category not found');

  res.json({ success: true, message: 'Category archived successfully', data: { category: cat } });
});
