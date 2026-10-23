import { Product, ProductVariant, Brand, Supplier, Customer, Sale, Purchase, Expense, InventoryTransaction, StockLevel } from '../models/index.js';
import { startOfDay, endOfDay, round2 } from '../utils/helpers.js';

export async function getDashboardMetrics(branchId = null) {
  const branchFilter = branchId ? { branch: branchId } : {};

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Parallel counts and aggregations
  const [
    totalProducts,
    totalVariants,
    totalBrands,
    totalSuppliers,
    totalCustomers,
    stockAgg,
    lowStockCount,
    outOfStockCount,
    todaySalesAgg,
    monthSalesAgg,
    purchasesAgg,
    receivablesAgg,
    payablesAgg,
    recentSales,
    recentPurchases,
    recentMovements,
  ] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    ProductVariant.countDocuments({ isActive: true }),
    Brand.countDocuments({ isActive: true }),
    Supplier.countDocuments({ isActive: true }),
    Customer.countDocuments({ isActive: true }),

    // Total Stock and Valuation
    ProductVariant.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalQty: { $sum: '$currentStock' },
          totalValuationCost: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$avgCost', '$purchaseCost'] }] } },
          totalValuationRetail: { $sum: { $multiply: ['$currentStock', '$retailPrice'] } },
        },
      },
    ]),

    // Low stock variants count
    ProductVariant.countDocuments({
      isActive: true,
      $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$minStock'] }] },
    }),

    // Out of stock count
    ProductVariant.countDocuments({
      isActive: true,
      currentStock: { $lte: 0 },
    }),

    // Today's Sales
    Sale.aggregate([
      { $match: { ...branchFilter, saleDate: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          cogs: { $sum: '$cogsTotal' },
          received: { $sum: '$paidAmount' },
        },
      },
    ]),

    // Month's Sales
    Sale.aggregate([
      { $match: { ...branchFilter, saleDate: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          cogs: { $sum: '$cogsTotal' },
          received: { $sum: '$paidAmount' },
        },
      },
    ]),

    // Total Purchases (Received value)
    Purchase.aggregate([
      { $match: { ...branchFilter, status: { $in: ['received', 'partially_received'] } } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$receivedValue' },
          totalPaid: { $sum: '$paidAmount' },
          totalDue: { $sum: '$balanceDue' },
        },
      },
    ]),

    // Outstanding customer payments (Accounts Receivable)
    Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalDue: { $sum: '$outstandingBalance' } } },
    ]),

    // Outstanding supplier dues (Accounts Payable)
    Supplier.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalDue: { $sum: '$outstandingBalance' } } },
    ]),

    // Recent 5 sales
    Sale.find({ ...branchFilter, status: { $ne: 'cancelled' } })
      .sort({ saleDate: -1 })
      .limit(5)
      .populate('cashier', 'name')
      .lean(),

    // Recent 5 purchases
    Purchase.find(branchFilter)
      .sort({ orderDate: -1 })
      .limit(5)
      .populate('supplier', 'name')
      .lean(),

    // Recent 5 stock movements
    InventoryTransaction.find(branchFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('product', 'name')
      .populate('variant', 'sku sizeMl')
      .populate('warehouse', 'name')
      .lean(),
  ]);

  const today = todaySalesAgg[0] || { count: 0, revenue: 0, cogs: 0, received: 0 };
  const month = monthSalesAgg[0] || { count: 0, revenue: 0, cogs: 0, received: 0 };
  const purchase = purchasesAgg[0] || { totalValue: 0, totalPaid: 0, totalDue: 0 };
  const stock = stockAgg[0] || { totalQty: 0, totalValuationCost: 0, totalValuationRetail: 0 };

  // Calculate gross profit for month
  const monthGrossProfit = round2(month.revenue - month.cogs);

  // Top 5 Best-Selling perfumes this month
  const bestSellers = await Sale.aggregate([
    { $match: { ...branchFilter, saleDate: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.variant',
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { quantitySold: -1 } },
    { $limit: 5 },
  ]);

  // Last 6 months revenue trend
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyTrend = await Sale.aggregate([
    { $match: { ...branchFilter, saleDate: { $gte: sixMonthsAgo }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
        },
        sales: { $sum: '$grandTotal' },
        cogs: { $sum: '$cogsTotal' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedTrend = monthlyTrend.map((m) => ({
    name: `${monthNames[m._id.month - 1]} ${m._id.year}`,
    sales: round2(m.sales),
    profit: round2(m.sales - m.cogs),
    orders: m.count,
  }));

  return {
    overview: {
      totalProducts,
      totalVariants,
      totalBrands,
      totalSuppliers,
      totalCustomers,
      totalStockQty: stock.totalQty,
      valuationCost: round2(stock.totalValuationCost),
      valuationRetail: round2(stock.totalValuationRetail),
      lowStockCount,
      outOfStockCount,
    },
    sales: {
      todayRevenue: round2(today.revenue),
      todayOrders: today.count,
      todayReceived: round2(today.received),
      monthRevenue: round2(month.revenue),
      monthOrders: month.count,
      monthGrossProfit,
    },
    purchases: {
      totalValue: round2(purchase.totalValue),
      totalPaid: round2(purchase.totalPaid),
      balanceDue: round2(purchase.totalDue),
    },
    finances: {
      receivables: round2(receivablesAgg[0]?.totalDue || 0),
      payables: round2(payablesAgg[0]?.totalDue || 0),
    },
    bestSellers,
    monthlyTrend: formattedTrend,
    recentSales,
    recentPurchases,
    recentMovements,
  };
}

export async function getSalesReport({ from, to, branchId, groupBy = 'day' }) {
  const match = { status: { $ne: 'cancelled' } };
  if (branchId) match.branch = branchId;
  if (from || to) {
    match.saleDate = {};
    if (from) match.saleDate.$gte = startOfDay(new Date(from));
    if (to) match.saleDate.$lte = endOfDay(new Date(to));
  }

  const sales = await Sale.find(match).sort({ saleDate: -1 }).populate('customer cashier branch');
  const totals = sales.reduce(
    (acc, s) => {
      acc.totalSales += s.grandTotal;
      acc.totalTax += s.taxTotal;
      acc.totalDiscount += (s.itemDiscountTotal + s.cartDiscount + s.couponDiscount + s.loyaltyDiscount);
      acc.totalPaid += s.paidAmount;
      acc.totalBalance += s.balanceDue;
      acc.totalCogs += s.cogsTotal;
      return acc;
    },
    { totalSales: 0, totalTax: 0, totalDiscount: 0, totalPaid: 0, totalBalance: 0, totalCogs: 0 }
  );

  totals.grossProfit = round2(totals.totalSales - totals.totalCogs);
  totals.count = sales.length;

  return { sales, totals };
}

export async function getProfitLossReport({ from, to, branchId }) {
  const dateFilter = {};
  if (from) dateFilter.$gte = startOfDay(new Date(from));
  if (to) dateFilter.$lte = endOfDay(new Date(to));

  const saleMatch = { status: { $ne: 'cancelled' } };
  const expMatch = { isArchived: false };
  if (branchId) {
    saleMatch.branch = branchId;
    expMatch.branch = branchId;
  }
  if (from || to) {
    saleMatch.saleDate = dateFilter;
    expMatch.date = dateFilter;
  }

  const [salesAgg, expensesAgg] = await Promise.all([
    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalCogs: { $sum: '$cogsTotal' },
          totalTax: { $sum: '$taxTotal' },
          totalDiscounts: { $sum: { $add: ['$itemDiscountTotal', '$cartDiscount', '$couponDiscount', '$loyaltyDiscount'] } },
        },
      },
    ]),
    Expense.aggregate([
      { $match: expMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const s = salesAgg[0] || { totalRevenue: 0, totalCogs: 0, totalTax: 0, totalDiscounts: 0 };
  const revenue = round2(s.totalRevenue);
  const cogs = round2(s.totalCogs);
  const grossProfit = round2(revenue - cogs);

  const expensesByCategory = expensesAgg.map((e) => ({ category: e._id, amount: round2(e.total) }));
  const totalOperatingExpenses = round2(expensesByCategory.reduce((sum, e) => sum + e.amount, 0));
  const netProfit = round2(grossProfit - totalOperatingExpenses);

  return {
    revenue,
    cogs,
    grossProfit,
    grossMarginPercent: revenue > 0 ? round2((grossProfit / revenue) * 100) : 0,
    expensesByCategory,
    totalOperatingExpenses,
    netProfit,
    netMarginPercent: revenue > 0 ? round2((netProfit / revenue) * 100) : 0,
  };
}
