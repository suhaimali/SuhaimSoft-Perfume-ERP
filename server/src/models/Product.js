import mongoose from 'mongoose';

const { Schema } = mongoose;

export const GENDERS = ['men', 'women', 'unisex', 'kids', 'other'];
export const CONCENTRATIONS = ['Parfum', 'EDP', 'EDT', 'EDC', 'Attar', 'Body Mist', 'Perfume Oil', 'Other'];

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    perfumeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    fragranceName: { type: String, trim: true },
    fragranceFamily: { type: Schema.Types.ObjectId, ref: 'Category' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    gender: { type: String, enum: GENDERS, default: 'unisex', index: true },
    description: { type: String, maxlength: 4000 },
    topNotes: String,
    heartNotes: String,
    baseNotes: String,
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    image: String,
    tags: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    collections: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    attributes: [{ name: String, value: String, _id: false }],
    hasExpiry: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
productSchema.index({ name: 'text', fragranceName: 'text', perfumeCode: 'text' });
productSchema.virtual('variants', { ref: 'ProductVariant', localField: '_id', foreignField: 'product' });

export const Product = mongoose.model('Product', productSchema);

const variantSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    name: { type: String, trim: true }, // e.g. "100 ml EDP"
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true, index: { unique: true, partialFilterExpression: { barcode: { $type: 'string', $gt: '' } } } },
    concentration: { type: String, enum: CONCENTRATIONS, default: 'EDP' },
    sizeMl: { type: Number, required: true, min: 0.1, max: 10000 },
    purchaseCost: { type: Number, required: true, min: 0, default: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, min: 0 },
    discountPrice: { type: Number, min: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 18 },
    taxInclusive: { type: Boolean, default: true },
    hsnCode: { type: String, default: '3303' },
    minStock: { type: Number, min: 0, default: 5 },
    reorderQty: { type: Number, min: 0, default: 10 },
    // Denormalised total across all warehouses; maintained only by the inventory service.
    currentStock: { type: Number, default: 0 },
    avgCost: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
variantSchema.index({ currentStock: 1, minStock: 1 });

variantSchema.pre('validate', function (next) {
  if (this.discountPrice != null && this.discountPrice > this.retailPrice) {
    return next(new Error('Discount price cannot exceed retail price'));
  }
  next();
});

export const ProductVariant = mongoose.model('ProductVariant', variantSchema);
