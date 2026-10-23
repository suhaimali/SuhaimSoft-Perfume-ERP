import mongoose from 'mongoose';
import { addressSchema } from './Branch.js';

const { Schema } = mongoose;

const settingSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    business: {
      name: { type: String, default: 'SuhaimSoft Perfumes' },
      legalName: String,
      tagline: { type: String, default: 'Manage Every Fragrance. Control Every Sale.' },
      logo: String,
      address: addressSchema,
      phone: String,
      email: String,
      website: String,
      taxId: String, // GSTIN
      stateCode: String,
    },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    tax: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'GST' },
      defaultRate: { type: Number, default: 18 },
      pricesIncludeTax: { type: Boolean, default: true },
      rates: { type: [{ name: String, rate: Number, _id: false }], default: [{ name: 'GST 0%', rate: 0 }, { name: 'GST 5%', rate: 5 }, { name: 'GST 12%', rate: 12 }, { name: 'GST 18%', rate: 18 }, { name: 'GST 28%', rate: 28 }] },
    },
    invoice: {
      salePrefix: { type: String, default: 'INV-' },
      purchasePrefix: { type: String, default: 'PO-' },
      returnPrefix: { type: String, default: 'RET-' },
      paymentPrefix: { type: String, default: 'PAY-' },
      transferPrefix: { type: String, default: 'TRF-' },
      expensePrefix: { type: String, default: 'EXP-' },
      padding: { type: Number, default: 5, min: 3, max: 10 },
      footer: { type: String, default: 'Thank you for shopping with us!' },
      terms: { type: String, default: 'Goods once sold can be returned within 7 days in original sealed condition.' },
      roundOff: { type: Boolean, default: true },
    },
    paymentMethods: {
      type: [{ key: String, label: String, enabled: { type: Boolean, default: true }, _id: false }],
      default: [
        { key: 'cash', label: 'Cash', enabled: true },
        { key: 'card', label: 'Card', enabled: true },
        { key: 'upi', label: 'UPI', enabled: true },
        { key: 'bank', label: 'Bank Transfer', enabled: true },
        { key: 'cheque', label: 'Cheque', enabled: false },
      ],
    },
    stock: {
      allowNegativeStock: { type: Boolean, default: false },
      defaultLowStockThreshold: { type: Number, default: 5 },
      expiryAlertDays: { type: Number, default: 60 },
    },
    loyalty: {
      enabled: { type: Boolean, default: true },
      pointsPer100: { type: Number, default: 1 }, // points earned per ₹100 spent
      pointValue: { type: Number, default: 1 }, // ₹ value of one point on redemption
      minRedeemPoints: { type: Number, default: 50 },
    },
    discounts: {
      maxDiscountPercentDefault: { type: Number, default: 10 },
    },
    security: {
      maxLoginAttempts: { type: Number, default: 5 },
      lockMinutes: { type: Number, default: 15 },
      passwordMinLength: { type: Number, default: 8 },
      sessionTimeoutMinutes: { type: Number, default: 480 },
    },
    payroll: { enabled: { type: Boolean, default: false } },
  },
  { timestamps: true }
);

export const BusinessSetting = mongoose.model('BusinessSetting', settingSchema);

// Atomic sequence generator for document numbers.
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', counterSchema);

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    kind: { type: String, enum: ['coupon', 'offer'], default: 'coupon' }, // offers auto-apply without a code
    description: String,
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minPurchase: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    customerType: { type: String, enum: ['all', 'retail', 'wholesale'], default: 'all' },
    validFrom: Date,
    validTo: Date,
    usageLimit: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupon = mongoose.model('Coupon', couponSchema);

const borrowHistorySchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    reason: String,
    status: { type: String, enum: ['pending', 'partially_deducted', 'settled'], default: 'pending' },
    settledAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'cash' },
    notes: String,
  },
  { timestamps: true }
);

const payrollHistorySchema = new Schema(
  {
    month: { type: String, required: true },
    baseSalary: { type: Number, required: true },
    advanceDeduction: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netPaid: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'bank' },
    reference: String,
    notes: String,
    expenseRef: { type: Schema.Types.ObjectId, ref: 'Expense' },
  },
  { timestamps: true }
);

const employeeSchema = new Schema(
  {
    employeeCode: { type: String, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    jobTitle: String,
    department: String,
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    address: addressSchema,
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    joinDate: Date,
    status: { type: String, enum: ['active', 'on_leave', 'resigned', 'terminated'], default: 'active' },
    salary: { type: Number, min: 0, default: 0 },
    advanceBalance: { type: Number, default: 0, min: 0 },
    bankAccount: { type: String },
    idProof: { type: String },
    emergencyContact: String,
    notes: String,
    borrowHistory: [borrowHistorySchema],
    payrollHistory: [payrollHistorySchema],
  },
  { timestamps: true }
);

export const Employee = mongoose.model('Employee', employeeSchema);
