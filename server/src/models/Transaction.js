import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PURCHASE_STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled', 'returned'];
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'overpaid'];

// PurchaseItem (embedded line item)
const purchaseItemSchema = new Schema({
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  sku: String,
  quantity: { type: Number, required: true, min: 1 },
  receivedQty: { type: Number, default: 0, min: 0 },
  returnedQty: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 }, // line discount amount
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  taxableValue: Number,
  taxAmount: Number,
  lineTotal: Number,
  batchNo: { type: String, default: '' },
  expiryDate: Date,
});

const purchaseSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: { type: String, enum: PURCHASE_STATUSES, default: 'draft', index: true },
    orderDate: { type: Date, default: Date.now, index: true },
    expectedDate: Date,
    items: { type: [purchaseItemSchema], validate: [(v) => v.length > 0, 'At least one item is required'] },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    additionalCosts: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0 },
    // Payable is recognised only on received goods value.
    receivedValue: { type: Number, default: 0 },
    returnedValue: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    supplierInvoiceNo: String,
    supplierInvoiceDate: Date,
    notes: String,
    receipts: [
      {
        date: { type: Date, default: Date.now },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
        items: [{ variant: Schema.Types.ObjectId, name: String, quantity: Number, batchNo: String, expiryDate: Date, _id: false }],
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
  },
  { timestamps: true }
);

export const Purchase = mongoose.model('Purchase', purchaseSchema);

// SaleItem (embedded line item)
const saleItemSchema = new Schema({
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  sku: String,
  brandName: String,
  sizeMl: Number,
  concentration: String,
  quantity: { type: Number, required: true, min: 1 },
  returnedQty: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 }, // list price used (retail/wholesale/discount)
  discount: { type: Number, default: 0, min: 0 }, // total line discount amount
  taxRate: { type: Number, default: 0 },
  taxInclusive: { type: Boolean, default: true },
  taxableValue: Number,
  taxAmount: Number,
  lineTotal: Number, // incl. tax, after line discount
  unitCost: { type: Number, default: 0 }, // COGS snapshot
  batches: [{ batchNo: String, expiryDate: Date, qty: Number, _id: false }],
});

const salePaymentSchema = new Schema(
  { method: String, amount: Number, reference: String, payment: { type: Schema.Types.ObjectId, ref: 'Payment' } },
  { _id: false }
);

const saleSchema = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    clientRequestId: { type: String, index: { unique: true, sparse: true } },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerName: String,
    customerPhone: String,
    priceType: { type: String, enum: ['retail', 'wholesale'], default: 'retail' },
    items: { type: [saleItemSchema], validate: [(v) => v.length > 0, 'At least one item is required'] },
    subtotal: { type: Number, default: 0 }, // sum of qty*unitPrice
    itemDiscountTotal: { type: Number, default: 0 },
    cartDiscount: { type: Number, default: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    loyaltyPointsRedeemed: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
    taxableTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    returnedValue: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
    status: { type: String, enum: ['completed', 'partially_returned', 'returned', 'cancelled'], default: 'completed', index: true },
    payments: [salePaymentSchema],
    cogsTotal: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    discountApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    notes: String,
    saleDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const Sale = mongoose.model('Sale', saleSchema);
