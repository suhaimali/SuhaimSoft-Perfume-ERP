import { getDashboardMetrics, getSalesReport, getProfitLossReport } from '../services/reportService.js';
import { ProductVariant, Sale } from '../models/index.js';
import { asyncHandler } from '../utils/ApiError.js';
import { round2 } from '../utils/helpers.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || (req.user?.isMasterAdmin ? null : req.user?.branch);
  const data = await getDashboardMetrics(branchId);
  res.json({ success: true, data });
});

export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { from, to, branch } = req.query;
  const branchId = branch || (req.user?.isMasterAdmin ? null : req.user?.branch);
  const data = await getSalesReport({ from, to, branchId });
  res.json({ success: true, data });
});

export const getProfitLoss = asyncHandler(async (req, res) => {
  const { from, to, branch } = req.query;
  const branchId = branch || (req.user?.isMasterAdmin ? null : req.user?.branch);
  const data = await getProfitLossReport({ from, to, branchId });
  res.json({ success: true, data });
});

export const getInventoryValuation = asyncHandler(async (_req, res) => {
  const variants = await ProductVariant.find({ isActive: true })
    .populate({ path: 'product', populate: { path: 'brand category' } });

  let totalQty = 0;
  let totalCost = 0;
  let totalRetail = 0;

  const items = variants.map((v) => {
    const qty = v.currentStock || 0;
    const cost = v.avgCost || v.purchaseCost || 0;
    const retail = v.retailPrice || 0;
    const totalCostVal = qty * cost;
    const totalRetailVal = qty * retail;

    totalQty += qty;
    totalCost += totalCostVal;
    totalRetail += totalRetailVal;

    return {
      id: v._id,
      name: v.product?.name,
      brand: v.product?.brand?.name,
      sku: v.sku,
      sizeMl: v.sizeMl,
      concentration: v.concentration,
      stock: qty,
      minStock: v.minStock,
      unitCost: round2(cost),
      unitRetail: round2(retail),
      totalCostValue: round2(totalCostVal),
      totalRetailValue: round2(totalRetailVal),
      potentialProfit: round2(totalRetailVal - totalCostVal),
    };
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalVariants: items.length,
        totalQty,
        totalCostValuation: round2(totalCost),
        totalRetailValuation: round2(totalRetail),
        potentialGrossProfit: round2(totalRetail - totalCost),
      },
      items,
    },
  });
});

export const exportSalesCsv = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { status: { $ne: 'cancelled' } };
  if (from || to) {
    match.saleDate = {};
    if (from) match.saleDate.$gte = new Date(from);
    if (to) match.saleDate.$lte = new Date(to);
  }

  const sales = await Sale.find(match).sort({ saleDate: -1 });

  let csv = 'Invoice No,Date,Customer,Price Type,Subtotal,Discount,Tax,Grand Total,Paid,Balance,Status,Payment Status\n';
  for (const s of sales) {
    const d = new Date(s.saleDate).toISOString().slice(0, 10);
    const disc = (s.itemDiscountTotal || 0) + (s.cartDiscount || 0) + (s.couponDiscount || 0) + (s.loyaltyDiscount || 0);
    csv += `"${s.invoiceNo}","${d}","${s.customerName || 'Walk-in'}","${s.priceType}",${s.subtotal},${disc},${s.taxTotal},${s.grandTotal},${s.paidAmount},${s.balanceDue},"${s.status}","${s.paymentStatus}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
  res.send(csv);
});
