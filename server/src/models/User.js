import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    avatar: String,
    isMasterAdmin: { type: Boolean, default: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    // Custom per-user overrides on top of role permissions
    extraPermissions: [{ type: String }],
    deniedPermissions: [{ type: String }],
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    allowedBranches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    maxDiscountPercent: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    tokenVersion: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: Date,
    mustChangePassword: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
    lastLoginIp: String,
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      alerts: {
        lowStock: { type: Boolean, default: true },
        outOfStock: { type: Boolean, default: true },
        pendingPurchases: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.failedLoginCount;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
