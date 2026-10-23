import mongoose from 'mongoose';

const { Schema } = mongoose;

const addressSchema = new Schema(
  { line1: String, line2: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
  { _id: false }
);

const branchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['store', 'warehouse', 'office'], default: 'store' },
    address: addressSchema,
    phone: String,
    email: String,
    gstin: String,
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Branch = mongoose.model('Branch', branchSchema);

const warehouseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: { type: String, enum: ['store', 'warehouse'], default: 'store' },
    address: addressSchema,
    isDefault: { type: Boolean, default: false }, // default stock location of its branch
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export { addressSchema };
