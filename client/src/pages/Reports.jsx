import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Percent,
} from 'lucide-react';
import api from '../services/api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('pl');
  const [plData, setPlData] = useState(null);
  const [valuationData, setValuationData] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
  });

  const loadReports = () => {
    setLoading(true);
    let q = '';
    if (dateFilter.from) q += `&from=${dateFilter.from}`;
    if (dateFilter.to) q += `&to=${dateFilter.to}`;

    Promise.all([
      api.get(`/reports/profit-loss?${q}`),
      api.get(`/reports/inventory-valuation`),
      api.get(`/reports/sales?${q}`),
    ])
      .then(([plRes, valRes, saleRes]) => {
        setPlData(plRes.data.data);
        setValuationData(valRes.data.data);
        setSalesReport(saleRes.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [dateFilter]);

  const handleExportCsv = () => {
    let url = '/api/v1/reports/export/sales-csv?';
    if (dateFilter.from) url += `&from=${dateFilter.from}`;
    if (dateFilter.to) url += `&to=${dateFilter.to}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (val) => {
    if (val == null) return '₹0';
    const num = Number(val);
    if (num < 0) {
      return `-₹${Math.abs(num).toLocaleString('en-IN')}`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Financial Reports & Inventory Valuation</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Certified accounting summaries: Profit & Loss, Gross Margins, Stock Valuation, and CSV exports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* Tabs & Date Range Filter Aligned Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pl')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'pl'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Profit & Loss Statement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('valuation')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'valuation'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Valuation</span>
          </button>
        </div>

        {/* Date Filter Integrated Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#334155] font-semibold flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter:</span>
          </span>
          <label htmlFor="reports-date-from" className="sr-only">Date from</label>
          <input
            id="reports-date-from"
            name="dateFrom"
            type="date"
            autoComplete="off"
            value={dateFilter.from}
            onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
            className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
          />
          <span className="text-[#94A3B8] text-[11px]">to</span>
          <label htmlFor="reports-date-to" className="sr-only">Date to</label>
          <input
            id="reports-date-to"
            name="dateTo"
            type="date"
            autoComplete="off"
            value={dateFilter.to}
            onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
            className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
          />
          {(dateFilter.from || dateFilter.to) && (
            <button
              type="button"
              onClick={() => setDateFilter({ from: '', to: '' })}
              className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#94A3B8]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Calculating statement metrics...
        </div>
      ) : activeTab === 'pl' && plData ? (
        <div className="space-y-6">
          {/* Headline Financial Cards - Full Width Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Sales Revenue</span>
                <p className="text-2xl font-bold text-[#0F172A] mt-1.5">{formatCurrency(plData.revenue)}</p>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-2 pt-2 border-t border-[#F1F5F9]">Net invoiced customer sales</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
                <p className="text-2xl font-bold text-[#475569] mt-1.5">{formatCurrency(plData.cogs)}</p>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-2 pt-2 border-t border-[#F1F5F9]">Stock cost of perfumes sold</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Gross Profit</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1.5">{formatCurrency(plData.grossProfit)}</p>
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold mt-2 pt-2 border-t border-[#F1F5F9]">{plData.grossMarginPercent}% gross margin</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Net Operating Profit</span>
                <p className={`text-2xl font-bold mt-1.5 ${plData.netProfit >= 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {formatCurrency(plData.netProfit)}
                </p>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-2 pt-2 border-t border-[#F1F5F9]">After operating disbursements</p>
            </div>
          </div>

          {/* Statement & Expense Breakdown Balanced 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Comprehensive Income Statement */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="font-bold text-[#0F172A] uppercase tracking-wider text-xs flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Comprehensive Income Statement</span>
                </h3>
                <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
                  Accrual Basis
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 text-[#0F172A] font-semibold">
                  <span>Gross Sales Revenue</span>
                  <span className="font-mono text-sm">{formatCurrency(plData.revenue)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 text-rose-600 font-medium">
                  <span>Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-mono text-sm">-{formatCurrency(plData.cogs)}</span>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-emerald-700 text-sm">
                  <span>GROSS PROFIT</span>
                  <span className="font-mono text-base">{formatCurrency(plData.grossProfit)}</span>
                </div>

                <div className="pt-3">
                  <span className="text-[#334155] font-bold uppercase tracking-wider text-[11px] block mb-2">
                    Operating Expenses
                  </span>

                  <div className="space-y-1.5 pl-2">
                    {plData.expensesByCategory && plData.expensesByCategory.length > 0 ? (
                      plData.expensesByCategory.map((e) => (
                        <div key={e.category} className="flex items-center justify-between py-1 text-[#64748B] hover:text-[#0F172A]">
                          <span className="capitalize flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                            <span>{e.category}</span>
                          </span>
                          <span className="font-mono">{formatCurrency(e.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-[#94A3B8] italic py-1">No operating expenses recorded for period.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[#E2E8F0] text-rose-600 font-semibold">
                  <span>Total Operating Expenses</span>
                  <span className="font-mono text-sm">-{formatCurrency(plData.totalOperatingExpenses)}</span>
                </div>

                <div className="flex items-center justify-between py-3.5 px-4 rounded-xl bg-blue-50 border border-blue-200 font-bold text-base text-blue-900">
                  <span>NET PROFIT / (LOSS)</span>
                  <span className="font-mono text-lg">{formatCurrency(plData.netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Expense Analysis & Margins */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="font-bold text-[#0F172A] uppercase tracking-wider text-xs flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span>Expense Distribution & Health</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B]">Gross Margin</span>
                    <span className="font-bold text-emerald-700">{plData.grossMarginPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.max(plData.grossMarginPercent || 0, 0), 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B]">Operating Expense Ratio</span>
                    <span className="font-bold text-[#0F172A]">
                      {plData.revenue > 0
                        ? `${Math.round(((plData.totalOperatingExpenses || 0) / plData.revenue) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          Math.max(
                            plData.revenue > 0
                              ? Math.round(((plData.totalOperatingExpenses || 0) / plData.revenue) * 100)
                              : 0,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                  <span className="text-[#334155] font-bold text-[11px] uppercase tracking-wider block">
                    Category Breakdown
                  </span>
                  <div className="space-y-2">
                    {plData.expensesByCategory && plData.expensesByCategory.length > 0 ? (
                      plData.expensesByCategory.map((e) => {
                        const pct =
                          plData.totalOperatingExpenses > 0
                            ? Math.round((e.amount / plData.totalOperatingExpenses) * 100)
                            : 0;
                        return (
                          <div key={e.category} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="capitalize text-[#334155] font-medium">{e.category}</span>
                              <span className="text-[#64748B] font-mono">
                                {formatCurrency(e.amount)} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-[#94A3B8] italic">No operating expense categories recorded.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#0F172A]">Operating Performance Summary</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    {plData.netProfit >= 0
                      ? 'The business is operating profitably with healthy gross margins.'
                      : 'Operating disbursements exceed gross profit for the period. Review overhead costs.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'valuation' && valuationData ? (
        <div className="space-y-6">
          {/* Valuation Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Total Physical Stock</span>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {valuationData.summary?.totalQty} <span className="text-xs text-[#64748B] font-normal">units</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Cost Valuation (Purchase)</span>
              <p className="text-2xl font-bold text-[#334155] mt-1.5">
                {formatCurrency(valuationData.summary?.totalCostValuation)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Retail Valuation (Potential Sales)</span>
              <p className="text-2xl font-bold text-blue-600 mt-1.5">
                {formatCurrency(valuationData.summary?.totalRetailValuation)}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table aria-label="Perfume Inventory Valuation Table" className="w-full text-left text-xs">
                <caption className="sr-only">Inventory Valuation and Unit Cost Breakdown</caption>
                <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Perfume Product</th>
                    <th scope="col" className="px-4 py-3.5">SKU & Spec</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Units</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Unit Cost</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Total Cost Value</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Potential Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {valuationData.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#0F172A]">
                        {item.name}
                        <span className="block text-[10px] text-blue-600 font-semibold">{item.brand}</span>
                      </td>

                      <td className="px-4 py-3.5 text-[#64748B]">
                        {item.sku} ({item.sizeMl}ml {item.concentration})
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-[#0F172A]">
                        {item.stock}
                      </td>

                      <td className="px-4 py-3.5 text-right text-[#64748B]">
                        {formatCurrency(item.unitCost)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-semibold text-[#0F172A]">
                        {formatCurrency(item.totalCostValue)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                        {formatCurrency(item.potentialProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
