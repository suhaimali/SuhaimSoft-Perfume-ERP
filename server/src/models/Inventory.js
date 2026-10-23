import mongoose from 'mongoose';

const { Schema } = mongoose;

// Blocks mutation of append-only ledgers (stock movements, audit log).
export function immutablePlugin(schema) {
  const block = function (next) {
    next(new Error(`${this.model?.modelName || 'Record'} entries are immutable`));
  };
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) =>
    schema.pre(op, block)
  );
  schema.pre('save', function (next) {
    if (!this.isNew) return next(new Error('Immutable record cannot be modified'));
    next();
  });
}

export const MOVEMENT_TYPES = [
  'opening',
  'purchase_receipt',
  'purchase_return',
  'sale',
  'sale_return',
  'adjustment_in',
  'adjustment_out',
  'damaged',
  'leaked',
  'lost',
  'expired',
  'transfer_out',
  'transfer_in',
  'stock_count',
];

// Current stock per variant / warehouse / batch.
const stockLevelSchema = new Schema(
  {
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    batchNo: { type: String, default: '' },
    expiryDate: Date,
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);
stockLevelSchema.index({ variant: 1, warehouse: 1, batchNo: 1 }, { unique: true });
stockLevelSchema.index({ expiryDate: 1 });

export const StockLevel = mongoose.model('StockLevel', stockLevelSchema);

const inventoryTxSchema = new Schema(
  {
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    batchNo: { type: String, default: '' },
    expiryDate: Date,
    type: { type: String, enum: MOVEMENT_TYPES, required: true, index: true },
    quantity: { type: Number, required: true }, // signed: +in / -out
    balanceAfter: { type: Number, required: true }, // variant total across all warehouses after movement
    locationBalanceAfter: Number, // variant total in this warehouse after movement
    unitCost: { type: Number, default: 0 },
    reason: String,
    refModel: { type: String, enum: ['Sale', 'Purchase', 'Return', 'StockTransfer', 'Adjustment', 'Product', null] },
    refId: { type: Schema.Types.ObjectId },
    refNumber: String,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
inventoryTxSchema.index({ createdAt: -1 });
inventoryTxSchema.index({ refModel: 1, refId: 1 });

export const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTxSchema);

const transferItemSchema = new Schema(
  {
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    sku: String,
    quantity: { type: Number, required: true, min: 1 },
    batches: [{ batchNo: String, expiryDate: Date, qty: Number, _id: false }],
  },
  { _id: false }
);

const stockTransferSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    fromWarehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    toWarehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    items: { type: [transferItemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: ['in_transit', 'completed', 'cancelled'], default: 'in_transit', index: true },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedAt: Date,
  },
  { timestamps: true }
);

export const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);

// Physical stock counts
const stockCountSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
    items: [
      {
        variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        name: String,
        sku: String,
        systemQty: Number,
        countedQty: { type: Number, min: 0 },
        difference: Number,
        _id: false,
      },
    ],
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    postedAt: Date,
  },
  { timestamps: true }
);

export const StockCount = mongoose.model('StockCount', stockCountSchema);
