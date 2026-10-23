import mongoose from 'mongoose';

const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    country: String,
    website: String,
    description: String,
    logo: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
brandSchema.index({ name: 'text' });

export const Brand = mongoose.model('Brand', brandSchema);

export const CATEGORY_TYPES = ['category', 'fragrance_family', 'concentration', 'bottle_size', 'tag', 'collection', 'attribute'];

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: CATEGORY_TYPES, required: true, index: true },
    value: String, // e.g. "100" for bottle size in ml, or attribute options
    description: String,
    parent: { type: Schema.Types.ObjectId, ref: 'Category' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
categorySchema.index({ type: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Category = mongoose.model('Category', categorySchema);
