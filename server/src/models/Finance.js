import mongoose from 'mongoose';
import { immutablePlugin } from './Inventory.js';

const { Schema } = mongoose;

export const PAYMENT_KINDS = ['sale_payment', 'customer_receipt', 'customer_refund', 'supplier_payment', 'supplier_refund', 'cash_in', 'cash_out'];

const paymentSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    clientRequestId: { type: String, index: { unique: true, sparse: true } },
    kind: { type: String, enum: PAYMENT_KINDS, required: true, index: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    method: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    reference: String,
    date: { type: Date, default: Date.now, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
    purchase: { type: Schema.Types.ObjectId, ref: 'Purchase', index: true },
    return: { type: Schema.Types.ObjectId, ref: 'Return' },
    // Which invoices this payment settled (sale/purchase), used for precise reversal on void.
    allocations: [
      {
        sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
        purchase: { type: Schema.Types.ObjectId, ref: 'Purchase' },
        number: String,
        amount: Number,
        _id: false,
      },
    ],
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    notes: String,
    status: { type: String, enum: ['completed', 'voided'], default: 'completed', index: true },
    voidReason: String,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reconciled: { type: Boolean, default: false },
    reconciledAt: Date,
    reconciledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);

const returnItemSchema = new Schema(
  {
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    lineId: Schema.Types.ObjectId, // original sale/purchase line
    name: String,
    sku: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: Number,
    taxAmount: Number,
    lineTotal: Number,
    unitCost: Number,
    condition: { type: String, enum: ['good', 'damaged', 'leaked', 'expired'], default: 'good' },
    restock: { type: Boolean, default: true },
    batchNo: String,
  },
  { _id: false }
);

const returnSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    clientRequestId: { type: String, index: { unique: true, sparse: true } },
    type: { type: String, enum: ['sale', 'purchase'], required: true, index: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
    purchase: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    items: [returnItemSchema],
    subtotal: Number,
    taxTotal: Number,
    total: { type: Number, required: true },
    // How the value was settled: adjusted against balance due, refunded in cash/method, or kept as credit note.
    adjustedAmount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    refundMethod: String,
    reason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Return = mongoose.model('Return', returnSchema);

export const EXPENSE_CATEGORIES = ['rent', 'salaries', 'transport', 'packaging', 'electricity', 'marketing', 'maintenance', 'internet', 'taxes', 'other'];

const expenseSchema = new Schema(
  {
    number: { type: String, unique: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, required: true },
    reference: String,
    payee: String,
    description: { type: String, maxlength: 2000 },
    attachment: String,
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);

const cashClosingSchema = new Schema(
  {
    date: { type: Date, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    openingCash: { type: Number, default: 0 },
    cashIn: { type: Number, default: 0 },
    cashOut: { type: Number, default: 0 },
    expensesCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    countedCash: { type: Number, required: true, min: 0 },
    difference: { type: Number, default: 0 },
    byMethod: [{ method: String, amountIn: Number, amountOut: Number, _id: false }],
    notes: String,
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
cashClosingSchema.index({ branch: 1, date: 1 }, { unique: true });

export const CashClosing = mongoose.model('CashClosing', cashClosingSchema);

const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userName: String,
    action: { type: String, required: true, index: true },
    module: { type: String, index: true },
    entityId: Schema.Types.ObjectId,
    entityRef: String,
    description: String,
    ip: String,
    userAgent: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.plugin(immutablePlugin);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const notificationSchema = new Schema(
  {
    // Either targeted to a specific user, or to everyone holding `audience` permission (master admins always see all).
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    audience: { type: String, index: true },
    type: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'expiry', 'pending_purchase', 'outstanding_payment', 'supplier_due', 'customer_balance', 'failed_operation', 'system'],
      required: true,
    },
    severity: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
    title: { type: String, required: true },
    message: String,
    link: String,
    dedupeKey: { type: String, index: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
