import mongoose from 'mongoose';
import { Product, ProductVariant, Warehouse, Brand } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, escapeRegex } from '../utils/helpers.js';
import { adjustStock } from '../services/inventoryService.js';
import { logAudit } from '../services/notificationService.js';

export const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { perfumeCode: rx }, { fragranceName: rx }];
  }
  if (req.query.brand) filter.brand = req.query.brand;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.gender) filter.gender = req.query.gender;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brand fragranceFamily category supplier')
      .populate('variants'),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(products, total, { page, limit }) });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('brand fragranceFamily category supplier')
    .populate('variants');

  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: { product } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    perfumeCode,
    brand,
    fragranceName,
    fragranceFamily,
    category,
    gender,
    description,
    topNotes,
    heartNotes,
    baseNotes,
    supplier,
    image,
    variants = [],
    warehouseId,
  } = req.body;

  if (!name || !perfumeCode || !brand) {
    throw ApiError.badRequest('Product name, perfume code, and brand are required');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Product.findOne({ perfumeCode: perfumeCode.trim().toUpperCase() }).session(session);
    if (existing) throw ApiError.conflict('A product with this perfume code already exists');

    const product = new Product({
      name,
      perfumeCode: perfumeCode.trim().toUpperCase(),
      brand,
      fragranceName,
      fragranceFamily: fragranceFamily || undefined,
      category: category || undefined,
      gender: gender || 'unisex',
      description,
      topNotes,
      heartNotes,
      baseNotes,
      supplier: supplier || undefined,
      image,
      createdBy: req.user?._id,
    });

    await product.save({ session });

    // Create variants if provided
    const createdVariants = [];
    let defaultWarehouse = null;
    if (warehouseId) {
      defaultWarehouse = await Warehouse.findById(warehouseId).session(session);
    }
    if (!defaultWarehouse) {
      defaultWarehouse = await Warehouse.findOne({ isDefault: true }).session(session) || await Warehouse.findOne().session(session);
    }

    for (const v of variants) {
      if (!v.sku || !v.sizeMl || v.retailPrice == null) {
        throw ApiError.badRequest('Each variant must have SKU, size in ml, and retail price');
      }

      const variant = new ProductVariant({
        product: product._id,
        name: v.name || `${v.sizeMl}ml ${v.concentration || 'EDP'}`,
        sku: v.sku.trim().toUpperCase(),
        barcode: v.barcode ? v.barcode.trim() : undefined,
        concentration: v.concentration || 'EDP',
        sizeMl: Number(v.sizeMl),
        purchaseCost: Number(v.purchaseCost) || 0,
        retailPrice: Number(v.retailPrice),
        wholesalePrice: v.wholesalePrice != null ? Number(v.wholesalePrice) : undefined,
        discountPrice: v.discountPrice != null ? Number(v.discountPrice) : undefined,
        taxRate: v.taxRate != null ? Number(v.taxRate) : 18,
        taxInclusive: v.taxInclusive ?? true,
        minStock: v.minStock != null ? Number(v.minStock) : 5,
        currentStock: 0,
        avgCost: Number(v.purchaseCost) || 0,
      });

      await variant.save({ session });
      createdVariants.push(variant);

      // Record opening stock if specified
      const openingStock = Number(v.openingStock) || 0;
      if (openingStock > 0 && defaultWarehouse) {
        await adjustStock({
          variantId: variant._id,
          warehouseId: defaultWarehouse._id,
          quantity: openingStock,
          type: 'opening',
          reason: 'Initial opening stock',
          batchNo: v.batchNo || 'BATCH-001',
          expiryDate: v.expiryDate ? new Date(v.expiryDate) : undefined,
          unitCost: variant.purchaseCost,
          refModel: 'Product',
          refId: product._id,
          refNumber: product.perfumeCode,
          user: req.user,
          session,
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      user: req.user,
      action: 'create_product',
      module: 'products',
      entityId: product._id,
      entityRef: product.perfumeCode,
      description: `Created fragrance product ${product.name} (${product.perfumeCode}) with ${createdVariants.length} variants`,
      req,
    });

    const populated = await Product.findById(product._id)
      .populate('brand fragranceFamily category')
      .populate('variants');

    res.status(201).json({ success: true, message: 'Product created successfully', data: { product: populated } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
    .populate('brand fragranceFamily category')
    .populate('variants');

  if (!product) throw ApiError.notFound('Product not found');

  await logAudit({
    user: req.user,
    action: 'update_product',
    module: 'products',
    entityId: product._id,
    entityRef: product.perfumeCode,
    description: `Updated fragrance product ${product.name}`,
    req,
  });

  res.json({ success: true, message: 'Product updated successfully', data: { product } });
});

export const addVariant = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const v = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const variant = new ProductVariant({
    product: product._id,
    name: v.name || `${v.sizeMl}ml ${v.concentration || 'EDP'}`,
    sku: v.sku.trim().toUpperCase(),
    barcode: v.barcode ? v.barcode.trim() : undefined,
    concentration: v.concentration || 'EDP',
    sizeMl: Number(v.sizeMl),
    purchaseCost: Number(v.purchaseCost) || 0,
    retailPrice: Number(v.retailPrice),
    wholesalePrice: v.wholesalePrice != null ? Number(v.wholesalePrice) : undefined,
    discountPrice: v.discountPrice != null ? Number(v.discountPrice) : undefined,
    taxRate: v.taxRate != null ? Number(v.taxRate) : 18,
    taxInclusive: v.taxInclusive ?? true,
    minStock: v.minStock != null ? Number(v.minStock) : 5,
    currentStock: 0,
    avgCost: Number(v.purchaseCost) || 0,
  });

  await variant.save();

  if (v.openingStock && Number(v.openingStock) > 0) {
    const warehouse = (await Warehouse.findOne({ isDefault: true })) || (await Warehouse.findOne());
    if (warehouse) {
      await adjustStock({
        variantId: variant._id,
        warehouseId: warehouse._id,
        quantity: Number(v.openingStock),
        type: 'opening',
        reason: 'Opening stock for new variant',
        unitCost: variant.purchaseCost,
        user: req.user,
      });
    }
  }

  res.status(201).json({ success: true, message: 'Variant added successfully', data: { variant } });
});

export const updateVariant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const variant = await ProductVariant.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!variant) throw ApiError.notFound('Variant not found');

  res.json({ success: true, message: 'Variant updated successfully', data: { variant } });
});

export const searchVariants = asyncHandler(async (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';
  if (!q) {
    const variants = await ProductVariant.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(60)
      .populate({ path: 'product', populate: { path: 'brand category' } });
    return res.json({ success: true, data: { variants } });
  }

  const rx = new RegExp(escapeRegex(q), 'i');
  const matchingBrands = await Brand.find({ name: rx }).select('_id');
  const matchingBrandIds = matchingBrands.map((b) => b._id);

  const matchingProducts = await Product.find({
    $or: [
      { name: rx },
      { fragranceName: rx },
      { perfumeCode: rx },
      { brand: { $in: matchingBrandIds } },
    ],
  }).select('_id');
  const matchingProductIds = matchingProducts.map((p) => p._id);

  const variants = await ProductVariant.find({
    isActive: true,
    $or: [
      { sku: rx },
      { barcode: rx },
      { name: rx },
      { product: { $in: matchingProductIds } },
    ],
  })
    .limit(60)
    .populate({ path: 'product', populate: { path: 'brand category' } });

  res.json({ success: true, data: { variants } });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  await ProductVariant.deleteMany({ product: id });
  await Product.findByIdAndDelete(id);

  await logAudit({
    user: req.user,
    action: 'delete_product',
    module: 'products',
    entityId: id,
    entityRef: product.perfumeCode,
    description: `Deleted fragrance product ${product.name}`,
    req,
  });

  res.json({ success: true, message: 'Product and variants deleted successfully' });
});
