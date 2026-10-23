import mongoose from 'mongoose';
import { addressSchema } from './Branch.js';

const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    code: { type: String, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    contactPerson: String,
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: addressSchema,
    gstin: { type: String, uppercase: true, trim: true },
    pan: { type: String, uppercase: true, trim: true },
    paymentTermsDays: { type: Number, min: 0, default: 30 },
    openingBalance: { type: Number, default: 0 },
    // Amount we owe the supplier; maintained by purchase/payment/return services.
    outstandingBalance: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
supplierSchema.index({ name: 'text', company: 'text', phone: 'text' });

export const Supplier = mongoose.model('Supplier', supplierSchema);

const customerSchema = new Schema(
  {
    code: { type: String, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    type: { type: String, enum: ['retail', 'wholesale', 'vip'], default: 'retail', index: true },
    group: { type: String, trim: true },
    gstin: { type: String, uppercase: true, trim: true },
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    creditLimit: { type: Number, min: 0, default: 0 },
    loyaltyPoints: { type: Number, min: 0, default: 0 },
    totalSpent: { type: Number, default: 0 },
    // Amount the customer owes us; maintained by sale/payment/return services.
    outstandingBalance: { type: Number, default: 0 },
    dateOfBirth: Date,
    notes: String,
    preferences: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: true },
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
customerSchema.index({ name: 'text', phone: 'text', email: 'text', code: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
