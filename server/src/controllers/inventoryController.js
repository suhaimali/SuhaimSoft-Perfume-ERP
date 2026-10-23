import mongoose from 'mongoose';
import { StockLevel, InventoryTransaction, StockTransfer, StockCount, ProductVariant, Warehouse } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, dateRange } from '../utils/helpers.js';
import { adjustStock } from '../services/inventoryService.js';
import { getNextSequence } from '../services/sequenceService.js';
import { logAudit } from '../services/notificationService.js';

export const getStockLevels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.warehouse) filter.warehouse = req.query.warehouse;
  if (req.query.variant) filter.variant = req.query.variant;

  const [levels, total] = await Promise.all([
    StockLevel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('warehouse')
      .populate({ path: 'variant', populate: { path: 'product', populate: { path: 'brand' } } }),
    StockLevel.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(levels, total, { page, limit }) });
});

export const getMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const filter = { ...dateRange(req.query, 'createdAt') };

  if (req.query.warehouse) filter.warehouse = req.query.warehouse;
  if (req.query.variant) filter.variant = req.query.variant;
  if (req.query.type) filter.type = req.query.type;

  const [movements, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('warehouse product variant user'),
    InventoryTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(movements, total, { page, limit }) });
});

export const createAdjustment = asyncHandler(async (req, res) => {
  const { variantId, warehouseId, quantity, type, reason, batchNo, expiryDate } = req.body;
  if (!variantId || !warehouseId || quantity == null || !type) {
    throw ApiError.badRequest('Variant, warehouse, quantity, and adjustment type are required');
  }

  const validTypes = ['adjustment_in', 'adjustment_out', 'damaged', 'leaked', 'lost', 'expired'];
  if (!validTypes.includes(type)) {
    throw ApiError.badRequest(`Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Adjustments out must be negative quantity, in positive
  let adjQty = Number(quantity);
  if (['adjustment_out', 'damaged', 'leaked', 'lost', 'expired'].includes(type) && adjQty > 0) {
    adjQty = -adjQty;
  }

  const result = await adjustStock({
    variantId,
    warehouseId,
    quantity: adjQty,
    type,
    reason: reason || `Manual stock adjustment: ${type}`,
    batchNo: batchNo || '',
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    user: req.user,
  });

  await logAudit({
    user: req.user,
    action: 'stock_adjustment',
    module: 'inventory',
    entityId: result.tx._id,
    description: `Adjusted ${adjQty} units of ${result.variant.sku} (${type}) in warehouse`,
    req,
  });

  res.status(201).json({ success: true, message: 'Stock adjustment recorded', data: result });
});

export const createTransfer = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
  if (!fromWarehouseId || !toWarehouseId || !items || !items.length) {
    throw ApiError.badRequest('Source warehouse, destination warehouse, and at least one item are required');
  }
  if (fromWarehouseId === toWarehouseId) {
    throw ApiError.badRequest('Source and destination warehouses cannot be the same');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const number = await getNextSequence('transferPrefix', 'TRF-');
    const transferItems = [];

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId).session(session);
      if (!variant) throw ApiError.badRequest(`Variant not found: ${item.variantId}`);

      const qty = Number(item.quantity);
      if (qty <= 0) throw ApiError.badRequest('Quantity must be greater than 0');

      // Deduct from source warehouse
      await adjustStock({
        variantId: variant._id,
        warehouseId: fromWarehouseId,
        quantity: -qty,
        type: 'transfer_out',
        reason: `Transfer ${number} to warehouse`,
        refModel: 'StockTransfer',
        refNumber: number,
        user: req.user,
        session,
      });

      // Add to destination warehouse
      await adjustStock({
        variantId: variant._id,
        warehouseId: toWarehouseId,
        quantity: qty,
        type: 'transfer_in',
        reason: `Transfer ${number} from warehouse`,
        refModel: 'StockTransfer',
        refNumber: number,
        user: req.user,
        session,
      });

      transferItems.push({
        variant: variant._id,
        product: variant.product,
        name: variant.name,
        sku: variant.sku,
        quantity: qty,
      });
    }

    const transfer = new StockTransfer({
      number,
      fromWarehouse: fromWarehouseId,
      toWarehouse: toWarehouseId,
      items: transferItems,
      status: 'completed',
      notes,
      createdBy: req.user?._id,
      receivedBy: req.user?._id,
      receivedAt: new Date(),
    });

    await transfer.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Stock transfer completed successfully', data: { transfer } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export const getTransfers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [transfers, total] = await Promise.all([
    StockTransfer.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromWarehouse toWarehouse createdBy'),
    StockTransfer.countDocuments(),
  ]);

  res.json({ success: true, data: paged(transfers, total, { page, limit }) });
});

export const updateStockLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity, batchNo, expiryDate, warehouseId } = req.body;

  const stockLevel = await StockLevel.findById(id).populate('variant');
  if (!stockLevel) {
    throw ApiError.notFound('Stock level record not found');
  }

  const oldQty = stockLevel.quantity;
  const newQty = quantity != null ? Number(quantity) : oldQty;
  const diff = newQty - oldQty;

  if (diff !== 0) {
    await adjustStock({
      variantId: stockLevel.variant._id,
      warehouseId: stockLevel.warehouse,
      quantity: diff,
      type: diff > 0 ? 'adjustment_in' : 'adjustment_out',
      reason: `Direct stock level edit from ${oldQty} to ${newQty}`,
      batchNo: stockLevel.batchNo,
      user: req.user,
    });
  }

  if (batchNo !== undefined) stockLevel.batchNo = batchNo;
  if (expiryDate !== undefined) stockLevel.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (warehouseId && String(warehouseId) !== String(stockLevel.warehouse)) {
    stockLevel.warehouse = warehouseId;
  }
  await stockLevel.save();

  await logAudit({
    user: req.user,
    action: 'stock_update',
    module: 'inventory',
    entityId: stockLevel._id,
    description: `Updated stock level ${stockLevel._id}: quantity ${oldQty} -> ${newQty}`,
    req,
  });

  const updated = await StockLevel.findById(id)
    .populate('warehouse')
    .populate({ path: 'variant', populate: { path: 'product brand' } });

  res.json({ success: true, message: 'Stock level updated successfully', data: { stockLevel: updated } });
});

export const deleteStockLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stockLevel = await StockLevel.findById(id).populate('variant');
  if (!stockLevel) {
    throw ApiError.notFound('Stock level record not found');
  }

  if (stockLevel.quantity > 0) {
    await adjustStock({
      variantId: stockLevel.variant._id,
      warehouseId: stockLevel.warehouse,
      quantity: -stockLevel.quantity,
      type: 'adjustment_out',
      reason: `Stock level record deleted by user (${stockLevel.quantity} units cleared)`,
      batchNo: stockLevel.batchNo,
      user: req.user,
    });
  }

  await StockLevel.findByIdAndDelete(id);

  await logAudit({
    user: req.user,
    action: 'stock_delete',
    module: 'inventory',
    entityId: id,
    description: `Deleted stock level record ${id}`,
    req,
  });

  res.json({ success: true, message: 'Stock level record deleted successfully' });
});

