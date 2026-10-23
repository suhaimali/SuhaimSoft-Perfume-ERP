import mongoose from 'mongoose';

const { Schema } = mongoose;

const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String,
    permissions: [{ type: String }],
    maxDiscountPercent: { type: Number, min: 0, max: 100, default: 10 },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);

const permissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    module: { type: String, required: true, index: true },
    action: { type: String, required: true },
    label: String,
  },
  { timestamps: true }
);

export const Permission = mongoose.model('Permission', permissionSchema);
