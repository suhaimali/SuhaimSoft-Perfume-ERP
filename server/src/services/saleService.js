import mongoose from 'mongoose';
import { Sale, ProductVariant, Customer, BusinessSetting, Coupon, Payment } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { adjustStock } from './inventoryService.js';
import { getNextSequence } from './sequenceService.js';
import { round2 } from '../utils/helpers.js';

export async function processSale({
  branchId,
  warehouseId,
  customerId = null,
  customerName = 'Walk-in Customer',
  customerPhone = '',
  priceType = 'retail',
  items = [],
  cartDiscount = 0,
  couponCode = null,
  loyaltyPointsToRedeem = 0,
  payments = [],
  notes = '',
  user,
}) {
  if (!items || items.length === 0) {
    throw ApiError.badRequest('Sale must contain at least one item');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await BusinessSetting.findOne({ key: 'default' }).session(session);
    const loyaltySettings = settings?.loyalty || { enabled: true, pointsPer100: 1, pointValue: 1, minRedeemPoints: 50 };

    let customer = null;
    if (customerId) {
      customer = await Customer.findById(customerId).session(session);
      if (!customer) throw ApiError.badRequest('Selected customer not found');
      if (customer.type === 'wholesale') {
        priceType = 'wholesale';
      }
    }

    // Process items and fetch true catalog info
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let taxableTotal = 0;
    let taxTotal = 0;
    let cogsTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId)
        .populate('product')
        .session(session);

      if (!variant) throw ApiError.badRequest(`Variant not found: ${item.variantId}`);
      if (!variant.isActive) throw ApiError.badRequest(`Product variant ${variant.sku} is not active`);

      const qty = Number(item.quantity) || 1;
      if (qty <= 0) throw ApiError.badRequest(`Quantity must be greater than 0 for ${variant.sku}`);

      // Server-side authoritative pricing
      let unitPrice = variant.retailPrice;
      if (priceType === 'wholesale' && variant.wholesalePrice != null) {
        unitPrice = variant.wholesalePrice;
      } else if (variant.discountPrice != null && variant.discountPrice > 0) {
        unitPrice = variant.discountPrice;
      }

      // Check per-item discount authorized
      let lineDiscount = Number(item.discount) || 0;
      if (lineDiscount > (unitPrice * qty)) {
        lineDiscount = unitPrice * qty;
      }

      // Tax calculation
      const taxRate = variant.taxRate || 0;
      const isInclusive = variant.taxInclusive ?? true;

      const grossLine = (unitPrice * qty) - lineDiscount;
      let lineTaxable = grossLine;
      let lineTax = 0;

      if (isInclusive && taxRate > 0) {
        lineTaxable = round2(grossLine / (1 + (taxRate / 100)));
        lineTax = round2(grossLine - lineTaxable);
      } else if (!isInclusive && taxRate > 0) {
        lineTaxable = grossLine;
        lineTax = round2(grossLine * (taxRate / 100));
      }

      const lineTotal = round2(lineTaxable + lineTax);
      const lineCost = (variant.avgCost || variant.purchaseCost || 0) * qty;

      subtotal += (unitPrice * qty);
      itemDiscountTotal += lineDiscount;
      taxableTotal += lineTaxable;
      taxTotal += lineTax;
      cogsTotal += lineCost;

      processedItems.push({
        variant: variant._id,
        product: variant.product._id,
        name: `${variant.product.name} - ${variant.name || (variant.sizeMl + 'ml ' + variant.concentration)}`,
        sku: variant.sku,
        brandName: variant.product.brand?.name || '',
        sizeMl: variant.sizeMl,
        concentration: variant.concentration,
        quantity: qty,
        unitPrice,
        discount: lineDiscount,
        taxRate,
        taxInclusive: isInclusive,
        taxableValue: lineTaxable,
        taxAmount: lineTax,
        lineTotal,
        unitCost: variant.avgCost || variant.purchaseCost || 0,
        batchNo: item.batchNo || '',
      });
    }

    // Coupon logic
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true,
      }).session(session);

      if (coupon) {
        const now = new Date();
        const validDates = (!coupon.validFrom || coupon.validFrom <= now) && (!coupon.validTo || coupon.validTo >= now);
        const validUsage = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
        const validMin = !coupon.minPurchase || subtotal >= coupon.minPurchase;

        if (validDates && validUsage && validMin) {
          if (coupon.discountType === 'percent') {
            couponDiscount = round2((subtotal * coupon.value) / 100);
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount;
            }
          } else {
            couponDiscount = Math.min(coupon.value, subtotal);
          }
          coupon.usedCount += 1;
          await coupon.save({ session });
        }
      }
    }

    // Loyalty redemption
    let loyaltyDiscount = 0;
    let pointsRedeemed = 0;
    if (customer && loyaltySettings.enabled && loyaltyPointsToRedeem > 0) {
      if (customer.loyaltyPoints >= loyaltySettings.minRedeemPoints && customer.loyaltyPoints >= loyaltyPointsToRedeem) {
        pointsRedeemed = loyaltyPointsToRedeem;
        loyaltyDiscount = round2(pointsRedeemed * (loyaltySettings.pointValue || 1));
        customer.loyaltyPoints -= pointsRedeemed;
      }
    }

    // Check if any items are tax-exclusive
    let taxExclusiveAddon = 0;
    for (const line of processedItems) {
      if (!line.taxInclusive && line.taxAmount > 0) {
        taxExclusiveAddon += line.taxAmount;
      }
    }

    const totalDiscounts = round2(itemDiscountTotal + Number(cartDiscount || 0) + couponDiscount + loyaltyDiscount);
    let preliminaryTotal = round2(subtotal - totalDiscounts + taxExclusiveAddon);
    if (preliminaryTotal < 0) preliminaryTotal = 0;

    const grandTotal = Math.round(preliminaryTotal); // round off to nearest rupee
    const roundOff = round2(grandTotal - preliminaryTotal);

    // Validate payments
    let paidAmount = 0;
    const validatedPayments = [];

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (amt <= 0) continue;
      paidAmount += amt;
      validatedPayments.push({
        method: p.method || 'cash',
        amount: round2(amt),
        reference: p.reference || '',
      });
    }

    paidAmount = round2(paidAmount);
    let balanceDue = 0;
    let changeDue = 0;

    if (paidAmount >= grandTotal) {
      changeDue = round2(paidAmount - grandTotal);
      paidAmount = grandTotal; // Net captured
    } else {
      balanceDue = round2(grandTotal - paidAmount);
    }

    let paymentStatus = 'unpaid';
    if (paidAmount >= grandTotal) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    // If there is an outstanding balance, customer must be provided
    if (balanceDue > 0 && !customer) {
      throw ApiError.badRequest('Credit sale with unpaid balance requires a registered customer');
    }

    const invoiceNo = await getNextSequence('salePrefix', 'INV-');

    const sale = new Sale({
      invoiceNo,
      branch: branchId,
      warehouse: warehouseId,
      customer: customer?._id,
      customerName: customer?.name || customerName,
      customerPhone: customer?.phone || customerPhone,
      priceType,
      items: processedItems,
      subtotal: round2(subtotal),
      itemDiscountTotal: round2(itemDiscountTotal),
      cartDiscount: round2(cartDiscount || 0),
      couponCode: couponCode || undefined,
      couponDiscount,
      loyaltyPointsRedeemed: pointsRedeemed,
      loyaltyDiscount,
      taxableTotal: round2(taxableTotal),
      taxTotal: round2(taxTotal),
      roundOff,
      grandTotal,
      paidAmount,
      balanceDue,
      changeDue,
      paymentStatus,
      status: 'completed',
      payments: validatedPayments,
      cogsTotal: round2(cogsTotal),
      cashier: user?._id || user?.id,
      notes,
      saleDate: new Date(),
    });

    // Deduct stock atomically for each line item
    for (const line of processedItems) {
      await adjustStock({
        variantId: line.variant,
        warehouseId,
        quantity: -line.quantity, // deduction
        type: 'sale',
        reason: `Sale ${invoiceNo}`,
        batchNo: line.batchNo || '',
        unitCost: line.unitCost,
        refModel: 'Sale',
        refId: sale._id,
        refNumber: invoiceNo,
        user,
        session,
      });
    }

    // Create payment records
    for (const vp of validatedPayments) {
      const payNumber = await getNextSequence('paymentPrefix', 'PAY-');
      const payRecord = new Payment({
        number: payNumber,
        kind: 'sale_payment',
        direction: 'in',
        method: vp.method,
        amount: vp.amount,
        reference: vp.reference,
        customer: customer?._id,
        sale: sale._id,
        branch: branchId,
        allocations: [{ sale: sale._id, number: invoiceNo, amount: vp.amount }],
        createdBy: user?._id || user?.id,
      });
      await payRecord.save({ session });
      vp.payment = payRecord._id;
    }

    // Customer ledger and points update
    if (customer) {
      customer.totalSpent = round2((customer.totalSpent || 0) + grandTotal);
      if (balanceDue > 0) {
        customer.outstandingBalance = round2((customer.outstandingBalance || 0) + balanceDue);
      }
      // Accrue loyalty points
      if (loyaltySettings.enabled && loyaltySettings.pointsPer100 > 0) {
        const earnedPoints = Math.floor((grandTotal / 100) * loyaltySettings.pointsPer100);
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + earnedPoints;
        sale.pointsEarned = earnedPoints;
      }
      await customer.save({ session });
    }

    await sale.save({ session });
    await session.commitTransaction();
    session.endSession();

    return sale;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
