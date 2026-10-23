import { Payment, CashClosing, Customer, Supplier, Branch } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, dateRange } from '../utils/helpers.js';
import { recordCustomerPayment, recordSupplierPayment, calculateDailyCashSummary } from '../services/paymentService.js';
import { logAudit } from '../services/notificationService.js';

export const getPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...dateRange(req.query, 'date') };

  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.direction) filter.direction = req.query.direction;
  if (req.query.method) filter.method = req.query.method;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  if (req.query.branch) filter.branch = req.query.branch;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer supplier createdBy branch'),
    Payment.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(payments, total, { page, limit }) });
});

export const createCustomerPayment = asyncHandler(async (req, res) => {
  const { customerId, amount, method, reference, saleId, branchId, notes } = req.body;
  if (!customerId || !amount || !method) {
    throw ApiError.badRequest('Customer, amount, and payment method are required');
  }

  const payment = await recordCustomerPayment({
    customerId,
    amount,
    method,
    reference,
    saleId,
    branchId: branchId || req.user?.branch,
    user: req.user,
    notes,
  });

  await logAudit({
    user: req.user,
    action: 'customer_payment',
    module: 'payments',
    entityId: payment._id,
    entityRef: payment.number,
    description: `Received customer payment of ₹${payment.amount} via ${method}`,
    req,
  });

  res.status(201).json({ success: true, message: 'Customer payment recorded', data: { payment } });
});

export const createSupplierPayment = asyncHandler(async (req, res) => {
  const { supplierId, amount, method, reference, purchaseId, branchId, notes } = req.body;
  if (!supplierId || !amount || !method) {
    throw ApiError.badRequest('Supplier, amount, and payment method are required');
  }

  const payment = await recordSupplierPayment({
    supplierId,
    amount,
    method,
    reference,
    purchaseId,
    branchId: branchId || req.user?.branch,
    user: req.user,
    notes,
  });

  await logAudit({
    user: req.user,
    action: 'supplier_payment',
    module: 'payments',
    entityId: payment._id,
    entityRef: payment.number,
    description: `Made supplier payment of ₹${payment.amount} via ${method}`,
    req,
  });

  res.status(201).json({ success: true, message: 'Supplier payment recorded', data: { payment } });
});

export const getDailyCashPreview = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch;
  if (!branchId) {
    const defaultBranch = await Branch.findOne({ isDefault: true }) || await Branch.findOne();
    if (!defaultBranch) throw ApiError.badRequest('Branch is required');
    return res.json({
      success: true,
      data: await calculateDailyCashSummary({ branchId: defaultBranch._id, date: req.query.date ? new Date(req.query.date) : new Date() }),
    });
  }

  const summary = await calculateDailyCashSummary({
    branchId,
    date: req.query.date ? new Date(req.query.date) : new Date(),
  });

  res.json({ success: true, data: summary });
});

export const submitCashClosing = asyncHandler(async (req, res) => {
  const { branchId, date, openingCash = 0, countedCash, notes } = req.body;
  if (!branchId || countedCash == null) {
    throw ApiError.badRequest('Branch and counted physical cash are required');
  }

  const targetDate = date ? new Date(date) : new Date();
  const summary = await calculateDailyCashSummary({ branchId, date: targetDate });

  const totalExpected = summary.expectedCash + Number(openingCash);
  const difference = Number(countedCash) - totalExpected;

  const closing = new CashClosing({
    date: summary.date,
    branch: branchId,
    openingCash: Number(openingCash),
    cashIn: summary.cashIn,
    cashOut: summary.cashOut,
    expensesCash: summary.expensesCash,
    expectedCash: totalExpected,
    countedCash: Number(countedCash),
    difference,
    byMethod: summary.byMethod,
    notes,
    closedBy: req.user?._id,
  });

  await closing.save();

  res.status(201).json({ success: true, message: 'Daily cash closing saved', data: { closing } });
});

export const getCashClosings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [closings, total] = await Promise.all([
    CashClosing.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('branch closedBy'),
    CashClosing.countDocuments(),
  ]);

  res.json({ success: true, data: paged(closings, total, { page, limit }) });
});

export const deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await Payment.findById(id);
  if (!payment) throw ApiError.notFound('Payment record not found');
  await Payment.findByIdAndDelete(id);
  res.json({ success: true, message: 'Payment record deleted successfully' });
});
