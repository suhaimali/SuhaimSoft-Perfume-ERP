import mongoose from 'mongoose';
import { ProductVariant, StockLevel, InventoryTransaction, BusinessSetting, Warehouse } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notificationService.js';

export async function adjustStock({
  variantId,
  warehouseId,
  quantity, // positive for stock IN, negative for stock OUT
  type,
  reason,
  batchNo = '',
  expiryDate,
  unitCost = 0,
  refModel = null,
  refId = null,
  refNumber = '',
  user = null,
  session = null,
}) {
  const settings = await BusinessSetting.findOne({ key: 'default' }).session(session);
  const allowNegative = settings?.stock?.allowNegativeStock ?? false;

  const variant = await ProductVariant.findById(variantId).session(session);
  if (!variant) throw ApiError.notFound('Product variant not found');

  const warehouse = await Warehouse.findById(warehouseId).session(session);
  if (!warehouse) throw ApiError.notFound('Warehouse not found');

  let stockLevel = null;
  if (batchNo) {
    stockLevel = await StockLevel.findOne({
      variant: variantId,
      warehouse: warehouseId,
      batchNo,
    }).session(session);
  } else {
    // If deducting and no batch specified, pick the first batch with available stock
    if (quantity < 0) {
      stockLevel = await StockLevel.findOne({
        variant: variantId,
        warehouse: warehouseId,
        quantity: { $gt: 0 },
      }).sort({ createdAt: 1 }).session(session);
    }
    if (!stockLevel) {
      stockLevel = await StockLevel.findOne({
        variant: variantId,
        warehouse: warehouseId,
      }).session(session);
    }
  }

  if (!stockLevel) {
    if (quantity < 0 && !allowNegative) {
      throw ApiError.badRequest(`Insufficient stock in ${warehouse.name} for SKU ${variant.sku}. Available: 0, Requested: ${Math.abs(quantity)}`);
    }
    stockLevel = new StockLevel({
      variant: variantId,
      product: variant.product,
      warehouse: warehouseId,
      batchNo: batchNo || '',
      expiryDate,
      quantity: 0,
    });
  }

  const newLocationQty = stockLevel.quantity + quantity;
  if (newLocationQty < 0 && !allowNegative) {
    throw ApiError.badRequest(`Insufficient stock in ${warehouse.name} for SKU ${variant.sku}. Available: ${stockLevel.quantity}, Requested: ${Math.abs(quantity)}`);
  }

  stockLevel.quantity = newLocationQty;
  if (expiryDate && !stockLevel.expiryDate) {
    stockLevel.expiryDate = expiryDate;
  }
  await stockLevel.save({ session });

  // Update variant total current stock
  const newTotalStock = (variant.currentStock || 0) + quantity;
  if (newTotalStock < 0 && !allowNegative) {
    throw ApiError.badRequest(`Total available stock for SKU ${variant.sku} is insufficient. Current: ${variant.currentStock}, Requested deduction: ${Math.abs(quantity)}`);
  }
  variant.currentStock = newTotalStock;

  // Recalculate moving average cost if stock in with valid unitCost
  if (quantity > 0 && unitCost > 0) {
    const prevStock = Math.max(0, variant.currentStock - quantity);
    const prevCost = variant.avgCost || variant.purchaseCost || 0;
    const totalCostValue = (prevStock * prevCost) + (quantity * unitCost);
    const totalUnits = prevStock + quantity;
    if (totalUnits > 0) {
      variant.avgCost = Math.round((totalCostValue / totalUnits) * 100) / 100;
    }
  }
  await variant.save({ session });

  // Record immutable transaction
  const tx = new InventoryTransaction({
    variant: variantId,
    product: variant.product,
    warehouse: warehouseId,
    branch: warehouse.branch,
    batchNo: batchNo || '',
    expiryDate: stockLevel.expiryDate,
    type,
    quantity,
    balanceAfter: newTotalStock,
    locationBalanceAfter: newLocationQty,
    unitCost: unitCost || variant.purchaseCost || 0,
    reason: reason || `${type} transaction`,
    refModel,
    refId,
    refNumber,
    user: user?._id || user?.id,
  });
  await tx.save({ session });

  // Check alert thresholds asynchronously
  if (newTotalStock <= (variant.minStock || 5)) {
    setTimeout(async () => {
      try {
        if (newTotalStock <= 0) {
          await createNotification({
            type: 'out_of_stock',
            severity: 'danger',
            audience: 'inventory:view',
            title: `Out of Stock: ${variant.name || variant.sku}`,
            message: `Variant ${variant.sku} has reached 0 units in stock.`,
            link: `/inventory`,
            dedupeKey: `out_stock_${variant._id}`,
          });
        } else {
          await createNotification({
            type: 'low_stock',
            severity: 'warning',
            audience: 'inventory:view',
            title: `Low Stock Alert: ${variant.name || variant.sku}`,
            message: `Variant ${variant.sku} current stock (${newTotalStock}) is at or below reorder threshold (${variant.minStock}).`,
            link: `/inventory`,
            dedupeKey: `low_stock_${variant._id}`,
          });
        }
      } catch (e) {
        // quiet fallback
      }
    }, 100);
  }

  return { stockLevel, variant, tx };
}

export async function getWarehouseStockLevels(warehouseId, query = {}) {
  const filter = { warehouse: warehouseId };
  if (query.variant) filter.variant = query.variant;
  return StockLevel.find(filter).populate({ path: 'variant', populate: { path: 'product brand' } });
}
