import mongoose from 'mongoose';
import { Sale, ProductVariant, Warehouse, Return, Payment } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, dateRange, round2 } from '../utils/helpers.js';
import { processSale } from '../services/saleService.js';
import { adjustStock } from '../services/inventoryService.js';
import { getNextSequence } from '../services/sequenceService.js';
import { generateInvoicePdf } from '../services/pdfService.js';
import { logAudit } from '../services/notificationService.js';

export const getSales = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...dateRange(req.query, 'saleDate') };

  if (req.query.search) {
    filter.$or = [
      { invoiceNo: new RegExp(req.query.search, 'i') },
      { customerName: new RegExp(req.query.search, 'i') },
      { customerPhone: new RegExp(req.query.search, 'i') },
    ];
  }
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.branch) filter.branch = req.query.branch;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer cashier branch warehouse'),
    Sale.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(sales, total, { page, limit }) });
});

export const getSaleById = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer cashier branch warehouse')
    .populate('items.product items.variant');

  if (!sale) throw ApiError.notFound('Sale invoice not found');
  res.json({ success: true, data: { sale } });
});

export const createPosSale = asyncHandler(async (req, res) => {
  const { branchId, warehouseId, customerId, customerName, customerPhone, priceType, items, cartDiscount, couponCode, loyaltyPointsToRedeem, payments, notes } = req.body;

  let whId = warehouseId;
  if (!whId) {
    const defaultWh = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();
    whId = defaultWh?._id;
  }
  if (!whId) throw ApiError.badRequest('No warehouse configured for inventory deduction');

  const sale = await processSale({
    branchId: branchId || req.user?.branch,
    warehouseId: whId,
    customerId,
    customerName,
    customerPhone,
    priceType: priceType || 'retail',
    items,
    cartDiscount,
    couponCode,
    loyaltyPointsToRedeem,
    payments,
    notes,
    user: req.user,
  });

  await logAudit({
    user: req.user,
    action: 'pos_sale',
    module: 'sales',
    entityId: sale._id,
    entityRef: sale.invoiceNo,
    description: `Created invoice ${sale.invoiceNo} for ₹${sale.grandTotal} (${sale.paymentStatus})`,
    req,
  });

  res.status(201).json({ success: true, message: 'Sale completed successfully', data: { sale } });
});

export const updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, notes, customerName, customerPhone, paymentMethod } = req.body;
  const sale = await Sale.findByIdAndUpdate(
    id,
    { paymentStatus, notes, customerName, customerPhone, paymentMethod },
    { new: true, runValidators: true }
  ).populate('customer cashier branch warehouse');

  if (!sale) throw ApiError.notFound('Sale invoice not found');

  await logAudit({
    user: req.user,
    action: 'update_sale',
    module: 'sales',
    entityId: sale._id,
    entityRef: sale.invoiceNo,
    description: `Updated invoice ${sale.invoiceNo} status to ${sale.paymentStatus}`,
    req,
  });

  res.json({ success: true, message: 'Sale invoice updated successfully', data: { sale } });
});

export const deleteSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sale = await Sale.findById(id);
  if (!sale) throw ApiError.notFound('Sale invoice not found');

  await Sale.findByIdAndDelete(id);

  await logAudit({
    user: req.user,
    action: 'delete_sale',
    module: 'sales',
    entityId: id,
    entityRef: sale.invoiceNo,
    description: `Deleted sale invoice ${sale.invoiceNo}`,
    req,
  });

  res.json({ success: true, message: 'Sale invoice deleted successfully' });
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('customer branch');
  if (!sale) throw ApiError.notFound('Sale invoice not found');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Invoice-${sale.invoiceNo}.pdf"`);

  await generateInvoicePdf(sale, res);
});

export const processSaleReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, reason, refundMethod = 'cash' } = req.body;

  if (!items || !items.length) {
    throw ApiError.badRequest('At least one item must be returned');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(id).session(session);
    if (!sale) throw ApiError.notFound('Sale invoice not found');

    let totalReturnValue = 0;
    const returnItems = [];

    for (const ret of items) {
      const line = sale.items.find((i) => String(i.variant) === String(ret.variantId));
      if (!line) throw ApiError.badRequest(`Variant ${ret.variantId} was not in original invoice`);

      const qty = Number(ret.quantity);
      const remainingReturnable = line.quantity - (line.returnedQty || 0);
      if (qty <= 0 || qty > remainingReturnable) {
        throw ApiError.badRequest(`Invalid return quantity for ${line.name}. Max returnable: ${remainingReturnable}`);
      }

      line.returnedQty = (line.returnedQty || 0) + qty;
      const unitEffective = line.lineTotal / line.quantity;
      const lineReturnValue = round2(qty * unitEffective);
      totalReturnValue += lineReturnValue;

      returnItems.push({
        variant: line.variant,
        product: line.product,
        name: line.name,
        sku: line.sku,
        quantity: qty,
        unitPrice: line.unitPrice,
        lineTotal: lineReturnValue,
        unitCost: line.unitCost,
        condition: ret.condition || 'good',
        restock: ret.restock !== false,
      });

      // If condition is good and restock is requested, stock back into warehouse!
      if (ret.restock !== false) {
        await adjustStock({
          variantId: line.variant,
          warehouseId: sale.warehouse,
          quantity: qty, // positive = stock in
          type: 'sale_return',
          reason: `Customer return on invoice ${sale.invoiceNo}`,
          unitCost: line.unitCost,
          refModel: 'Sale',
          refId: sale._id,
          refNumber: sale.invoiceNo,
          user: req.user,
          session,
        });
      }
    }

    totalReturnValue = round2(totalReturnValue);
    sale.returnedValue = round2((sale.returnedValue || 0) + totalReturnValue);

    // If sale had unpaid balance, reduce balance first, otherwise issue refund
    let adjustedAmount = 0;
    let refundAmount = 0;

    if (sale.balanceDue > 0) {
      adjustedAmount = Math.min(totalReturnValue, sale.balanceDue);
      sale.balanceDue = round2(sale.balanceDue - adjustedAmount);
      refundAmount = round2(totalReturnValue - adjustedAmount);
    } else {
      refundAmount = totalReturnValue;
    }

    if (refundAmount > 0) {
      sale.refundedAmount = round2((sale.refundedAmount || 0) + refundAmount);
    }

    // Check if fully returned
    const allReturned = sale.items.every((i) => (i.returnedQty || 0) >= i.quantity);
    sale.status = allReturned ? 'returned' : 'partially_returned';

    const returnNumber = await getNextSequence('returnPrefix', 'RET-');
    const returnDoc = new Return({
      number: returnNumber,
      type: 'sale',
      sale: sale._id,
      customer: sale.customer,
      branch: sale.branch,
      warehouse: sale.warehouse,
      items: returnItems,
      total: totalReturnValue,
      adjustedAmount,
      refundAmount,
      refundMethod,
      reason,
      createdBy: req.user?._id,
    });
    await returnDoc.save({ session });

    // Record refund payment out if actual money was refunded
    if (refundAmount > 0) {
      const payNumber = await getNextSequence('paymentPrefix', 'PAY-');
      const refundPay = new Payment({
        number: payNumber,
        kind: 'customer_refund',
        direction: 'out',
        method: refundMethod,
        amount: refundAmount,
        customer: sale.customer,
        sale: sale._id,
        return: returnDoc._id,
        branch: sale.branch,
        notes: `Refund for return ${returnNumber}`,
        createdBy: req.user?._id,
      });
      await refundPay.save({ session });
    }

    await sale.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Return processed successfully', data: { return: returnDoc, sale } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});
