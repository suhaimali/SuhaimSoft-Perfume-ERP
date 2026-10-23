import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PerfumeBottle,
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  Users,
  DollarSign,
  Receipt,
  Boxes,
  Truck,
  Plus,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/dashboard')
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Instant Clean Skeleton while data loads to eliminate white splash/flicker */}
        <div className="h-32 bg-white rounded-2xl border border-slate-200"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-72 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  const { overview, sales, purchases, finances, bestSellers, monthlyTrend, recentSales, recentPurchases, recentMovements } = data || {};

  return (
    <div className="space-y-6">
      {/* Modern Clean Hero Banner (No Gold, No Red) */}
      <div className="rounded-2xl p-6 md:p-7 bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase font-mono bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>ENTERPRISE HUB</span>
            </span>
            <span className="flex items-center space-x-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Boutique Inventory Live</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
            Welcome back, <span>{user?.name || 'Suhaim Ali VP'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            SuhaimSoft Perfume ERP • Centralized inventory balances, fast retail billing, and real-time financial tracking.
          </p>
        </div>

        {/* Clean Modern Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer transition-all"
          >
            <Receipt className="w-4 h-4 text-white" />
            <span>Quick Billing</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>New Purchase Order</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs cursor-pointer transition-all"
          >
            <PerfumeBottle className="w-3.5 h-3.5 text-slate-600" />
            <span>Add Fragrance</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Today's Sales Revenue</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            ₹{sales?.todayRevenue?.toLocaleString('en-IN') || 0}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              +{sales?.todayOrders || 0} Orders
            </span>
            <span className="text-[11px] text-slate-500">settled today</span>
          </div>
        </div>

        {/* Monthly Revenue & Margin */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Month-to-Date Revenue</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            ₹{sales?.monthRevenue?.toLocaleString('en-IN') || 0}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ₹{sales?.monthGrossProfit?.toLocaleString('en-IN')} Margin
            </span>
          </div>
        </div>

        {/* Total Inventory Units */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Inventory Vault Qty</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            {overview?.totalStockQty || 0} <span className="text-xs font-normal text-slate-500">units</span>
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-[11px] text-slate-500">
              Retail Potential: <strong className="text-slate-800">₹{overview?.valuationRetail?.toLocaleString('en-IN') || 0}</strong>
            </span>
          </div>
        </div>

        {/* Stock Alert Counters */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Stock Health Monitor</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-2xl font-display font-extrabold text-slate-800">{overview?.lowStockCount || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Low Stock</p>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div>
              <p className="text-2xl font-display font-extrabold text-slate-700">{overview?.outOfStockCount || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Depleted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Fast Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Fragrance Formulas</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {overview?.totalProducts || 0} <span className="text-xs text-slate-500">({overview?.totalVariants} SKUs)</span>
            </p>
          </div>
          <PerfumeBottle className="w-5 h-5 text-blue-600" />
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Perfume Brands</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{overview?.totalBrands || 0} Active Houses</p>
          </div>
          <Layers className="w-5 h-5 text-indigo-600" />
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Customer Receivables (AR)</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">₹{finances?.receivables?.toLocaleString('en-IN') || 0}</p>
          </div>
          <Users className="w-5 h-5 text-blue-600" />
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Supplier Payables (AP)</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">₹{finances?.payables?.toLocaleString('en-IN') || 0}</p>
          </div>
          <Truck className="w-5 h-5 text-slate-700" />
        </div>
      </div>

      {/* Chart & Best Sellers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Revenue Trend */}
        <div className="lg:col-span-2 luxury-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <h2 className="text-base font-bold text-slate-900">Revenue & Margin Performance</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">6-Month sales trajectory and gross margin curves</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Revenue</span>
              </span>
              <span className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Gross Profit</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGradEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: '#0F172A',
                  }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGradBlue)" />
                <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGradEmerald)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best-Selling Perfumes */}
        <div className="luxury-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Top Moving Fragrances</h2>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                MONTHLY
              </span>
            </div>

            <div className="space-y-2.5">
              {bestSellers && bestSellers.length > 0 ? (
                bestSellers.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate pr-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono flex-shrink-0 ${
                        idx === 0
                          ? 'bg-blue-600 text-white'
                          : idx === 1
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-500 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-900">{item.quantitySold} bottles</p>
                      <p className="text-[10px] text-blue-600 font-semibold">₹{item.revenue?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-slate-500">No sales recorded yet this month</div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="w-full mt-4 py-2.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer text-center"
          >
            Access Full Sales Report &rarr;
          </button>
        </div>
      </div>

      {/* Real-time Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent POS Sales */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>Recent Sales Receipts</span>
            </h3>
            <button type="button" onClick={() => navigate('/sales')} className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales && recentSales.map((s) => (
              <div key={s._id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 font-mono">{s.invoiceNo}</p>
                  <p className="text-[10px] text-slate-500">{s.customerName || 'Walk-in Guest'} • {new Date(s.saleDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₹{s.grandTotal?.toLocaleString('en-IN')}</p>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                    s.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {s.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases (PO) */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-slate-700" />
              <span>Restock Orders (PO)</span>
            </h3>
            <button type="button" onClick={() => navigate('/purchases')} className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPurchases && recentPurchases.map((p) => (
              <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 font-mono">{p.number}</p>
                  <p className="text-[10px] text-slate-500">{p.supplier?.name} • {new Date(p.orderDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₹{p.grandTotal?.toLocaleString('en-IN')}</p>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                    p.status === 'received' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="luxury-card p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-700" />
              <span>Ledger Movement Stream</span>
            </h3>
            <button type="button" onClick={() => navigate('/inventory')} className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">
              View Ledger
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMovements && recentMovements.map((m) => (
              <div key={m._id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-900 truncate max-w-[150px]">{m.product?.name || 'Fragrance Bottle'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{m.variant?.sku} • {m.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold font-mono ${m.quantity > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </p>
                  <p className="text-[10px] text-slate-500">Bal: {m.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
