import { Purchase, ProductVariant, Warehouse } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, dateRange } from '../utils/helpers.js';
import { calculatePurchaseTotals, receivePurchaseItems } from '../services/purchaseService.js';
import { getNextSequence } from '../services/sequenceService.js';
import { logAudit } from '../services/notificationService.js';

export const getPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...dateRange(req.query, 'orderDate') };

  if (req.query.supplier) filter.supplier = req.query.supplier;
  if (req.query.warehouse) filter.warehouse = req.query.warehouse;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier warehouse createdBy'),
    Purchase.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(purchases, total, { page, limit }) });
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplier warehouse branch createdBy approvedBy')
    .populate('items.product items.variant');

  if (!purchase) throw ApiError.notFound('Purchase order not found');
  res.json({ success: true, data: { purchase } });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const { supplierId, warehouseId, branchId, orderDate, expectedDate, items, additionalCosts = 0, supplierInvoiceNo, supplierInvoiceDate, notes } = req.body;

  if (!supplierId || !warehouseId || !items || !items.length) {
    throw ApiError.badRequest('Supplier, warehouse, and at least one item are required');
  }

  // Hydrate items with name & sku
  const hydratedItems = [];
  for (const it of items) {
    const variant = await ProductVariant.findById(it.variantId).populate('product');
    if (!variant) throw ApiError.badRequest(`Variant not found: ${it.variantId}`);

    hydratedItems.push({
      variant: variant._id,
      product: variant.product._id,
      name: `${variant.product.name} - ${variant.name || (variant.sizeMl + 'ml ' + variant.concentration)}`,
      sku: variant.sku,
      quantity: Number(it.quantity),
      unitCost: Number(it.unitCost != null ? it.unitCost : variant.purchaseCost),
      discount: Number(it.discount) || 0,
      taxRate: Number(it.taxRate != null ? it.taxRate : variant.taxRate),
      batchNo: it.batchNo || '',
      expiryDate: it.expiryDate ? new Date(it.expiryDate) : undefined,
    });
  }

  const totals = await calculatePurchaseTotals(hydratedItems, additionalCosts);
  const number = await getNextSequence('purchasePrefix', 'PO-');

  const purchase = new Purchase({
    number,
    supplier: supplierId,
    warehouse: warehouseId,
    branch: branchId || undefined,
    status: 'ordered',
    orderDate: orderDate ? new Date(orderDate) : new Date(),
    expectedDate: expectedDate ? new Date(expectedDate) : undefined,
    items: totals.items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    additionalCosts: totals.additionalCosts,
    grandTotal: totals.grandTotal,
    receivedValue: 0,
    paidAmount: 0,
    balanceDue: 0,
    supplierInvoiceNo,
    supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : undefined,
    notes,
    createdBy: req.user?._id,
  });

  await purchase.save();

  await logAudit({
    user: req.user,
    action: 'create_purchase',
    module: 'purchases',
    entityId: purchase._id,
    entityRef: purchase.number,
    description: `Created PO ${purchase.number} for ₹${purchase.grandTotal}`,
    req,
  });

  res.status(201).json({ success: true, message: 'Purchase order created successfully', data: { purchase } });
});

export const receiveItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, note } = req.body;

  if (!items || !items.length) {
    throw ApiError.badRequest('At least one item receipt must be specified');
  }

  const purchase = await receivePurchaseItems({
    purchaseId: id,
    itemsToReceive: items,
    user: req.user,
    note,
  });

  await logAudit({
    user: req.user,
    action: 'receive_purchase',
    module: 'purchases',
    entityId: purchase._id,
    entityRef: purchase.number,
    description: `Received goods for PO ${purchase.number}`,
    req,
  });

  res.json({ success: true, message: 'Goods received and inventory updated', data: { purchase } });
});

export const cancelPurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchase = await Purchase.findById(id);
  if (!purchase) throw ApiError.notFound('Purchase order not found');

  if (purchase.status === 'received' || (purchase.receivedValue || 0) > 0) {
    throw ApiError.badRequest('Cannot cancel a purchase that has already received stock. Use purchase returns instead.');
  }

  purchase.status = 'cancelled';
  purchase.cancelledBy = req.user?._id;
  purchase.cancelledAt = new Date();
  await purchase.save();

  res.json({ success: true, message: 'Purchase order cancelled', data: { purchase } });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchase = await Purchase.findById(id);
  if (!purchase) throw ApiError.notFound('Purchase order not found');

  if (purchase.status === 'received' && (purchase.receivedValue || 0) > 0) {
    throw ApiError.badRequest('Cannot delete a purchase that has received inventory. Use returns instead.');
  }

  await Purchase.findByIdAndDelete(id);
  res.json({ success: true, message: 'Purchase order deleted successfully' });
});
