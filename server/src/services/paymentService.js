import mongoose from 'mongoose';
import { Payment, Sale, Purchase, Customer, Supplier, CashClosing, Expense } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getNextSequence } from './sequenceService.js';
import { round2, startOfDay, endOfDay } from '../utils/helpers.js';

export async function recordCustomerPayment({ customerId, amount, method, reference = '', saleId = null, branchId, user, notes = '' }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) throw ApiError.notFound('Customer not found');

    const numAmount = round2(Number(amount));
    if (numAmount <= 0) throw ApiError.badRequest('Payment amount must be greater than 0');

    const allocations = [];
    let remaining = numAmount;

    if (saleId) {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) throw ApiError.notFound('Sale invoice not found');
      if (sale.balanceDue <= 0) throw ApiError.badRequest('Invoice has no outstanding balance');

      const payAmt = Math.min(remaining, sale.balanceDue);
      sale.paidAmount = round2(sale.paidAmount + payAmt);
      sale.balanceDue = round2(sale.balanceDue - payAmt);
      sale.paymentStatus = sale.balanceDue === 0 ? 'paid' : 'partial';
      await sale.save({ session });

      allocations.push({ sale: sale._id, number: sale.invoiceNo, amount: payAmt });
      remaining = round2(remaining - payAmt);
    } else {
      // Auto-allocate against oldest unpaid sales for this customer
      const unpaidSales = await Sale.find({ customer: customerId, balanceDue: { $gt: 0 } })
        .sort({ saleDate: 1 })
        .session(session);

      for (const s of unpaidSales) {
        if (remaining <= 0) break;
        const payAmt = Math.min(remaining, s.balanceDue);
        s.paidAmount = round2(s.paidAmount + payAmt);
        s.balanceDue = round2(s.balanceDue - payAmt);
        s.paymentStatus = s.balanceDue === 0 ? 'paid' : 'partial';
        await s.save({ session });

        allocations.push({ sale: s._id, number: s.invoiceNo, amount: payAmt });
        remaining = round2(remaining - payAmt);
      }
    }

    // Deduct from customer's outstanding balance
    customer.outstandingBalance = round2(Math.max(0, (customer.outstandingBalance || 0) - numAmount));
    await customer.save({ session });

    const payNumber = await getNextSequence('paymentPrefix', 'PAY-');
    const payment = new Payment({
      number: payNumber,
      kind: 'customer_receipt',
      direction: 'in',
      method,
      amount: numAmount,
      reference,
      customer: customer._id,
      branch: branchId || customer.branch,
      allocations,
      notes,
      createdBy: user?._id || user?.id,
    });
    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();
    return payment;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function recordSupplierPayment({ supplierId, amount, method, reference = '', purchaseId = null, branchId, user, notes = '' }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) throw ApiError.notFound('Supplier not found');

    const numAmount = round2(Number(amount));
    if (numAmount <= 0) throw ApiError.badRequest('Payment amount must be greater than 0');

    const allocations = [];
    let remaining = numAmount;

    if (purchaseId) {
      const po = await Purchase.findById(purchaseId).session(session);
      if (!po) throw ApiError.notFound('Purchase order not found');
      if (po.balanceDue <= 0) throw ApiError.badRequest('Purchase order has no outstanding balance');

      const payAmt = Math.min(remaining, po.balanceDue);
      po.paidAmount = round2(po.paidAmount + payAmt);
      po.balanceDue = round2(po.balanceDue - payAmt);
      po.paymentStatus = po.balanceDue === 0 ? 'paid' : 'partial';
      await po.save({ session });

      allocations.push({ purchase: po._id, number: po.number, amount: payAmt });
      remaining = round2(remaining - payAmt);
    } else {
      // Auto-allocate against oldest unpaid purchases
      const unpaidPOs = await Purchase.find({ supplier: supplierId, balanceDue: { $gt: 0 } })
        .sort({ orderDate: 1 })
        .session(session);

      for (const po of unpaidPOs) {
        if (remaining <= 0) break;
        const payAmt = Math.min(remaining, po.balanceDue);
        po.paidAmount = round2(po.paidAmount + payAmt);
        po.balanceDue = round2(po.balanceDue - payAmt);
        po.paymentStatus = po.balanceDue === 0 ? 'paid' : 'partial';
        await po.save({ session });

        allocations.push({ purchase: po._id, number: po.number, amount: payAmt });
        remaining = round2(remaining - payAmt);
      }
    }

    // Deduct from supplier's outstanding dues
    supplier.outstandingBalance = round2(Math.max(0, (supplier.outstandingBalance || 0) - numAmount));
    await supplier.save({ session });

    const payNumber = await getNextSequence('paymentPrefix', 'PAY-');
    const payment = new Payment({
      number: payNumber,
      kind: 'supplier_payment',
      direction: 'out',
      method,
      amount: numAmount,
      reference,
      supplier: supplier._id,
      branch: branchId,
      allocations,
      notes,
      createdBy: user?._id || user?.id,
    });
    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();
    return payment;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function calculateDailyCashSummary({ branchId, date = new Date() }) {
  const from = startOfDay(date);
  const to = endOfDay(date);

  const payments = await Payment.find({
    branch: branchId,
    date: { $gte: from, $lte: to },
    status: 'completed',
  });

  const expenses = await Expense.find({
    branch: branchId,
    date: { $gte: from, $lte: to },
    isArchived: false,
  });

  let cashIn = 0;
  let cashOut = 0;
  let expensesCash = 0;
  const methodMap = {};

  for (const p of payments) {
    const m = p.method || 'cash';
    if (!methodMap[m]) methodMap[m] = { method: m, amountIn: 0, amountOut: 0 };

    if (p.direction === 'in') {
      methodMap[m].amountIn += p.amount;
      if (m === 'cash') cashIn += p.amount;
    } else {
      methodMap[m].amountOut += p.amount;
      if (m === 'cash') cashOut += p.amount;
    }
  }

  for (const e of expenses) {
    if (e.paymentMethod === 'cash') {
      expensesCash += e.amount;
    }
    const m = e.paymentMethod || 'cash';
    if (!methodMap[m]) methodMap[m] = { method: m, amountIn: 0, amountOut: 0 };
    methodMap[m].amountOut += e.amount;
  }

  const expectedCash = round2(cashIn - cashOut - expensesCash);

  return {
    date: from,
    branchId,
    cashIn: round2(cashIn),
    cashOut: round2(cashOut),
    expensesCash: round2(expensesCash),
    expectedCash: Math.max(0, expectedCash),
    byMethod: Object.values(methodMap).map((v) => ({
      method: v.method,
      amountIn: round2(v.amountIn),
      amountOut: round2(v.amountOut),
    })),
  };
}
