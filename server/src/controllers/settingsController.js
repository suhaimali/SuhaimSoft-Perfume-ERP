import { BusinessSetting, Coupon } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { logAudit } from '../services/notificationService.js';

export const getSettings = asyncHandler(async (_req, res) => {
  let settings = await BusinessSetting.findOne({ key: 'default' });
  if (!settings) {
    settings = await BusinessSetting.create({ key: 'default' });
  }
  res.json({ success: true, data: { settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await BusinessSetting.findOne({ key: 'default' });
  if (!settings) {
    settings = new BusinessSetting({ key: 'default' });
  }

  // Deep update sections
  if (req.body.business) settings.business = { ...settings.business, ...req.body.business };
  if (req.body.currency) settings.currency = req.body.currency;
  if (req.body.currencySymbol) settings.currencySymbol = req.body.currencySymbol;
  if (req.body.timezone) settings.timezone = req.body.timezone;
  if (req.body.dateFormat) settings.dateFormat = req.body.dateFormat;
  if (req.body.tax) settings.tax = { ...settings.tax, ...req.body.tax };
  if (req.body.invoice) settings.invoice = { ...settings.invoice, ...req.body.invoice };
  if (req.body.paymentMethods) settings.paymentMethods = req.body.paymentMethods;
  if (req.body.stock) settings.stock = { ...settings.stock, ...req.body.stock };
  if (req.body.loyalty) settings.loyalty = { ...settings.loyalty, ...req.body.loyalty };
  if (req.body.security) settings.security = { ...settings.security, ...req.body.security };

  await settings.save();

  await logAudit({
    user: req.user,
    action: 'update_settings',
    module: 'settings',
    description: 'Updated business settings configuration',
    req,
  });

  res.json({ success: true, message: 'Settings saved successfully', data: { settings } });
});

// COUPONS & OFFERS
export const getCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { coupons } });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const { code, name, kind, description, discountType, value, minPurchase, maxDiscount, validFrom, validTo, usageLimit } = req.body;
  if (!code || !name || !discountType || value == null) {
    throw ApiError.badRequest('Code, name, discount type, and value are required');
  }

  const coupon = new Coupon({
    code: code.trim().toUpperCase(),
    name,
    kind: kind || 'coupon',
    description,
    discountType,
    value: Number(value),
    minPurchase: Number(minPurchase) || 0,
    maxDiscount: maxDiscount != null ? Number(maxDiscount) : undefined,
    validFrom: validFrom ? new Date(validFrom) : undefined,
    validTo: validTo ? new Date(validTo) : undefined,
    usageLimit: usageLimit != null ? Number(usageLimit) : undefined,
  });

  await coupon.save();
  res.status(201).json({ success: true, message: 'Coupon created successfully', data: { coupon } });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!coupon) throw ApiError.notFound('Coupon not found');

  res.json({ success: true, message: 'Coupon updated successfully', data: { coupon } });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw ApiError.notFound('Coupon not found');

  res.json({ success: true, message: 'Coupon deleted successfully' });
});

