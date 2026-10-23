import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  Tag,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  CreditCard,
  Building,
  TrendingDown,
  Receipt,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

const CATEGORY_MAP = {
  packaging: { label: 'Packaging & Ribbons', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  rent: { label: 'Store Rent', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  salaries: { label: 'Salaries & Payroll', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  transport: { label: 'Shipping & Courier', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  electricity: { label: 'Electricity & Utilities', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  marketing: { label: 'Fragrance Marketing', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  maintenance: { label: 'Showroom Maintenance', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  other: { label: 'Other Operating', badge: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'packaging',
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    payee: '',
    description: '',
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit State
  const [editExpense, setEditExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    category: 'packaging',
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    payee: '',
    description: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete State
  const [deleteExpenseItem, setDeleteExpenseItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadExpenses = () => {
    setLoading(true);
    let q = '/expenses?limit=500';
    if (selectedCategory) q += `&category=${selectedCategory}`;
    if (selectedMethod) q += `&paymentMethod=${selectedMethod}`;
    if (dateFrom) q += `&from=${dateFrom}`;
    if (dateTo) q += `&to=${dateTo}`;

    api.get(q)
      .then((res) => setExpenses(res.data.data.items || []))
      .catch((err) => {
        toast.error('Failed to load expenses');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, selectedMethod, dateFrom, dateTo]);

  // Client-side instant search filtering
  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        (e.number && e.number.toLowerCase().includes(q)) ||
        (e.payee && e.payee.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.reference && e.reference.toLowerCase().includes(q))
      );
    }
    return result;
  }, [expenses, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / rowsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredExpenses.slice(start, start + rowsPerPage);
  }, [filteredExpenses, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedMethod, dateFrom, dateTo, rowsPerPage]);

  const activeFiltersCount = [
    search,
    selectedCategory,
    selectedMethod,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedMethod('');
    setDateFrom('');
    setDateTo('');
  };

  const openEditExpense = (exp) => {
    setEditExpense(exp);
    setEditForm({
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : '',
      category: exp.category || 'packaging',
      amount: exp.amount || '',
      paymentMethod: exp.paymentMethod || 'cash',
      reference: exp.reference || '',
      payee: exp.payee || '',
      description: exp.description || '',
    });
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editExpense) return;
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        amount: Number(editForm.amount),
        date: editForm.date ? new Date(editForm.date) : new Date(),
      };
      const res = await api.put(`/expenses/${editExpense._id}`, payload);
      const updated = res.data?.data?.expense || { ...editExpense, ...payload };
      
      // Update state immediately
      setExpenses((prev) => prev.map((exp) => (exp._id === editExpense._id ? { ...exp, ...updated } : exp)));
      
      toast.success(`Expense ${editExpense.number} updated successfully!`);
      setEditExpense(null);
      loadExpenses();
    } catch (err) {
      console.error('Update expense error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update expense');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteExpenseItem) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/expenses/${deleteExpenseItem._id}`);
      toast.success(`Expense ${deleteExpenseItem.number} deleted successfully`);
      setDeleteExpenseItem(null);
      loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete expense');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', form);
      toast.success('Operating expense recorded successfully');
      setShowModal(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: 'packaging',
        amount: '',
        paymentMethod: 'cash',
        reference: '',
        payee: '',
        description: '',
      });
      loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record expense');
    }
  };

  // Summary Metrics
  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + (e.amount || 0), 0), [expenses]);
  const avgExpense = useMemo(() => (expenses.length > 0 ? Math.round(totalSpent / expenses.length) : 0), [expenses, totalSpent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Operating Expenses</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Track showroom rent, luxury packaging boxes, ribbons, utilities, payroll, and shipping disbursements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards - Modern Charcoal Palette (No Gold) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Total Disbursements</span>
            <p className="text-2xl font-bold text-[#0F172A] mt-1.5">₹{totalSpent.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">Across all recorded operating bills</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Transactions Count</span>
            <p className="text-2xl font-bold text-[#0F172A] mt-1.5">{expenses.length}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">Total vouchers in fiscal ledger</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Average Bill</span>
            <p className="text-2xl font-bold text-[#0F172A] mt-1.5">₹{avgExpense.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">Mean expenditure per voucher</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <label htmlFor="expense-search-input" className="sr-only">Search expenses</label>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              id="expense-search-input"
              name="search"
              type="text"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by expense #, payee, description, or reference..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full lg:w-48">
            <label htmlFor="expense-filter-category" className="sr-only">Filter by category</label>
            <select
              id="expense-filter-category"
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="w-full lg:w-36">
            <label htmlFor="expense-filter-method" className="sr-only">Filter by payment method</label>
            <select
              id="expense-filter-method"
              name="paymentMethod"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Date Range From */}
          <div className="flex items-center space-x-1.5 text-xs text-[#64748B]">
            <label htmlFor="expense-date-from">From:</label>
            <input
              id="expense-date-from"
              name="dateFrom"
              type="date"
              autoComplete="off"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          {/* Date Range To */}
          <div className="flex items-center space-x-1.5 text-xs text-[#64748B]">
            <label htmlFor="expense-date-to">To:</label>
            <input
              id="expense-date-to"
              name="dateTo"
              type="date"
              autoComplete="off"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>

        {/* Filter Summary & Row Limit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B]">
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong>{paginatedExpenses.length}</strong> of <strong>{filteredExpenses.length}</strong> expenses
            </span>
            {activeFiltersCount > 0 && (
              <>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                  {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-rose-600 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="expense-rows-per-page" className="text-[11px] text-[#64748B]">Rows per page:</label>
            <select
              id="expense-rows-per-page"
              name="rowsPerPage"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table aria-label="Operating Expenses Ledger Table" className="w-full text-left text-xs">
            <caption className="sr-only">Operating Expenses Ledger</caption>
            <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th scope="col" className="px-5 py-3.5">Expense # & Date</th>
                <th scope="col" className="px-4 py-3.5">Category</th>
                <th scope="col" className="px-4 py-3.5">Payee / Vendor</th>
                <th scope="col" className="px-4 py-3.5">Method & Ref</th>
                <th scope="col" className="px-4 py-3.5 text-right">Amount</th>
                <th scope="col" className="px-4 py-3.5">Description</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-[#94A3B8]">
                    <div className="w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading expenses ledger...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[#64748B] mx-auto">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-[#0F172A] text-sm">No Operating Expenses Found</h4>
                      <p className="text-xs text-[#64748B]">
                        {activeFiltersCount > 0
                          ? 'No expense entries match your active search filters.'
                          : 'No expenses have been recorded yet. Click below to add your first bill.'}
                      </p>
                      {activeFiltersCount > 0 ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowModal(true)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] text-white hover:bg-[#1E293B] cursor-pointer"
                        >
                          Record Expense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category] || { label: exp.category, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  return (
                    <tr key={exp._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#0F172A]">{exp.number}</p>
                        <p className="text-[10px] text-[#64748B]">{new Date(exp.date).toLocaleDateString()}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[#0F172A] font-semibold">
                        {exp.payee || 'Direct Vendor'}
                      </td>

                      <td className="px-4 py-4 text-[#475569]">
                        <span className="uppercase font-semibold text-[#0F172A]">{exp.paymentMethod}</span>
                        {exp.reference && <span className="text-[10px] text-[#64748B] block font-mono">{exp.reference}</span>}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-rose-600 text-sm">
                        ₹{exp.amount?.toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-4 text-[#64748B] max-w-xs truncate">
                        {exp.description || 'N/A'}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            aria-label={`Edit operating expense ${exp.number}`}
                            onClick={() => openEditExpense(exp)}
                            title="Edit Operating Expense"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 transition-colors shadow-xs cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete operating expense ${exp.number}`}
                            onClick={() => setDeleteExpenseItem(exp)}
                            title="Delete Operating Expense"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredExpenses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[#E2E8F0] text-xs text-[#64748B] bg-[#F8FAFC]">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-[#94A3B8]">...</span>}
                    <button
                      type="button"
                      aria-label={`Page ${page}`}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}

              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] cursor-pointer flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Record Operating Expense</h3>
                <p className="text-[11px] text-[#64748B]">Add a new voucher to financial disbursements</p>
              </div>
              <button type="button" aria-label="Close record expense modal" onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0F172A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-add-date" className="block font-medium text-[#334155] mb-1">Date *</label>
                  <input
                    id="expense-add-date"
                    name="date"
                    type="date"
                    autoComplete="off"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label htmlFor="expense-add-category" className="block font-medium text-[#334155] mb-1">Category *</label>
                  <select
                    id="expense-add-category"
                    name="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] uppercase focus:outline-none focus:border-[#0F172A]"
                  >
                    {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-add-amount" className="block font-medium text-[#334155] mb-1">Amount (₹) *</label>
                  <input
                    id="expense-add-amount"
                    name="amount"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] font-bold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label htmlFor="expense-add-method" className="block font-medium text-[#334155] mb-1">Payment Method</label>
                  <select
                    id="expense-add-method"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="expense-add-payee" className="block font-medium text-[#334155] mb-1">Payee / Recipient</label>
                <input
                  id="expense-add-payee"
                  name="payee"
                  type="text"
                  autoComplete="name"
                  value={form.payee}
                  onChange={(e) => setForm({ ...form, payee: e.target.value })}
                  placeholder="e.g. Luxury Box Co. Mumbai"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label htmlFor="expense-add-desc" className="block font-medium text-[#334155] mb-1">Description / Bill Notes</label>
                <textarea
                  id="expense-add-desc"
                  name="description"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Reason for expenditure..."
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editExpense && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Edit Operating Expense</h3>
                  <p className="text-[11px] text-[#64748B]">Update voucher {editExpense.number}</p>
                </div>
              </div>
              <button type="button" aria-label="Close edit expense modal" onClick={() => setEditExpense(null)} className="text-[#64748B] hover:text-[#0F172A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-edit-date" className="block font-medium text-[#334155] mb-1">Date *</label>
                  <input
                    id="expense-edit-date"
                    name="date"
                    type="date"
                    autoComplete="off"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="expense-edit-category" className="block font-medium text-[#334155] mb-1">Category *</label>
                  <select
                    id="expense-edit-category"
                    name="category"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] uppercase focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-edit-amount" className="block font-medium text-[#334155] mb-1">Amount (₹) *</label>
                  <input
                    id="expense-edit-amount"
                    name="amount"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="expense-edit-method" className="block font-medium text-[#334155] mb-1">Payment Method</label>
                  <select
                    id="expense-edit-method"
                    name="paymentMethod"
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="expense-edit-payee" className="block font-medium text-[#334155] mb-1">Payee / Recipient</label>
                <input
                  id="expense-edit-payee"
                  name="payee"
                  type="text"
                  autoComplete="name"
                  value={editForm.payee}
                  onChange={(e) => setEditForm({ ...editForm, payee: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="expense-edit-desc" className="block font-medium text-[#334155] mb-1">Description</label>
                <textarea
                  id="expense-edit-desc"
                  name="description"
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditExpense(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deleteExpenseItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Delete Operating Expense?</h3>
                <p className="text-xs text-[#64748B]">This expense entry will be permanently archived</p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1 text-xs mb-4">
              <p className="font-bold text-[#0F172A]">{deleteExpenseItem.number} &mdash; ₹{deleteExpenseItem.amount?.toLocaleString('en-IN')}</p>
              <p className="text-[#64748B]">Category: <span className="capitalize font-medium text-[#0F172A]">{deleteExpenseItem.category}</span></p>
              <p className="text-[#64748B]">Payee: <span className="font-medium text-[#0F172A]">{deleteExpenseItem.payee || 'Direct Vendor'}</span></p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteExpenseItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
