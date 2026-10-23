import mongoose from 'mongoose';
import { Purchase, Supplier, ProductVariant } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { adjustStock } from './inventoryService.js';
import { getNextSequence } from './sequenceService.js';
import { round2 } from '../utils/helpers.js';

export async function calculatePurchaseTotals(items, additionalCosts = 0) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const processedItems = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const lineDiscount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const baseAmount = Math.max(0, (qty * unitCost) - lineDiscount);
    const taxAmount = round2(baseAmount * (taxRate / 100));
    const lineTotal = round2(baseAmount + taxAmount);

    subtotal += (qty * unitCost);
    discountTotal += lineDiscount;
    taxTotal += taxAmount;

    processedItems.push({
      ...item,
      taxableValue: baseAmount,
      taxAmount,
      lineTotal,
    });
  }

  const grandTotal = round2(subtotal - discountTotal + taxTotal + (Number(additionalCosts) || 0));

  return {
    items: processedItems,
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    additionalCosts: round2(additionalCosts),
    grandTotal,
  };
}

export async function receivePurchaseItems({ purchaseId, itemsToReceive, user, note = '' }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase) throw ApiError.notFound('Purchase order not found');

    if (['cancelled', 'returned'].includes(purchase.status)) {
      throw ApiError.badRequest(`Cannot receive items for a purchase in ${purchase.status} status`);
    }

    const receiptItems = [];
    let newlyReceivedValue = 0;

    for (const rec of itemsToReceive) {
      const line = purchase.items.find((i) => String(i.variant) === String(rec.variantId));
      if (!line) throw ApiError.badRequest(`Variant ${rec.variantId} not found in this purchase order`);

      const qty = Number(rec.quantity) || 0;
      if (qty <= 0) continue;

      const remainingToReceive = line.quantity - line.receivedQty;
      if (qty > remainingToReceive) {
        throw ApiError.badRequest(`Cannot receive ${qty} units of ${line.name}. Only ${remainingToReceive} units pending.`);
      }

      line.receivedQty += qty;
      if (rec.batchNo) line.batchNo = rec.batchNo;
      if (rec.expiryDate) line.expiryDate = rec.expiryDate;

      // Calculate value of this received quantity based on effective line unit cost
      const effectiveUnitCost = line.lineTotal / line.quantity;
      newlyReceivedValue += (qty * effectiveUnitCost);

      receiptItems.push({
        variant: line.variant,
        name: line.name,
        quantity: qty,
        batchNo: rec.batchNo || line.batchNo || '',
        expiryDate: rec.expiryDate || line.expiryDate,
      });

      // Adjust inventory - stock in!
      await adjustStock({
        variantId: line.variant,
        warehouseId: purchase.warehouse,
        quantity: qty,
        type: 'purchase_receipt',
        reason: `Goods receipt for PO ${purchase.number}`,
        batchNo: rec.batchNo || line.batchNo || '',
        expiryDate: rec.expiryDate || line.expiryDate,
        unitCost: line.unitCost,
        refModel: 'Purchase',
        refId: purchase._id,
        refNumber: purchase.number,
        user,
        session,
      });
    }

    if (receiptItems.length === 0) {
      throw ApiError.badRequest('No valid quantities received');
    }

    purchase.receipts.push({
      date: new Date(),
      user: user?._id || user?.id,
      note,
      items: receiptItems,
    });

    // Check if fully received or partially received
    const allReceived = purchase.items.every((i) => i.receivedQty >= i.quantity);
    purchase.status = allReceived ? 'received' : 'partially_received';

    // Update received value and supplier dues
    purchase.receivedValue = round2((purchase.receivedValue || 0) + newlyReceivedValue);
    purchase.balanceDue = round2(purchase.receivedValue - (purchase.paidAmount || 0));

    // Update supplier outstanding balance with the newly received goods value
    const supplier = await Supplier.findById(purchase.supplier).session(session);
    if (supplier) {
      supplier.outstandingBalance = round2((supplier.outstandingBalance || 0) + newlyReceivedValue);
      supplier.totalPurchased = round2((supplier.totalPurchased || 0) + newlyReceivedValue);
      await supplier.save({ session });
    }

    await purchase.save({ session });
    await session.commitTransaction();
    session.endSession();

    return purchase;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
