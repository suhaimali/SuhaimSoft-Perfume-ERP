import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Eye,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateSaleInvoicePdf } from '../utils/pdfGenerator';
import api from '../services/api';
import InvoiceViewerModal from '../components/InvoiceViewerModal';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination / Row Limit
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [viewSale, setViewSale] = useState(null);
  const [editSale, setEditSale] = useState(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    notes: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteSaleItem, setDeleteSaleItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [returnSale, setReturnSale] = useState(null);
  const [returnForm, setReturnForm] = useState({
    items: [],
    reason: 'Customer changed preference',
    refundMethod: 'cash',
  });

  const loadSales = () => {
    setLoading(true);
    let url = `/sales?limit=500&search=${encodeURIComponent(search)}`;
    if (paymentStatus) url += `&paymentStatus=${paymentStatus}`;
    if (dateFrom) url += `&from=${dateFrom}`;
    if (dateTo) url += `&to=${dateTo}`;

    api.get(url)
      .then((res) => setSales(res.data.data.items || []))
      .catch((err) => {
        toast.error('Failed to load sales register');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, [search, paymentStatus, dateFrom, dateTo]);

  // Client-side instant filtering on top of server query
  const filteredSales = useMemo(() => {
    let result = sales;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sales, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / rowsPerPage));
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSales.slice(start, start + rowsPerPage);
  }, [filteredSales, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, paymentStatus, dateFrom, dateTo, rowsPerPage]);

  const activeFiltersCount = [search, paymentStatus, dateFrom, dateTo].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setPaymentStatus('');
    setDateFrom('');
    setDateTo('');
  };

  // Edit Handlers
  const openEditModal = (sale) => {
    setEditSale(sale);
    setEditForm({
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      paymentStatus: sale.paymentStatus || 'paid',
      paymentMethod: sale.paymentMethod || 'cash',
      notes: sale.notes || '',
    });
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    if (!editSale) return;
    setEditSaving(true);
    try {
      await api.put(`/sales/${editSale._id}`, editForm);
      toast.success(`Invoice ${editSale.invoiceNo} updated successfully`);
      setEditSale(null);
      loadSales();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update sale invoice');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Handlers
  const handleDeleteSale = async () => {
    if (!deleteSaleItem) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/sales/${deleteSaleItem._id}`);
      toast.success(`Invoice ${deleteSaleItem.invoiceNo} deleted successfully`);
      setDeleteSaleItem(null);
      loadSales();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete sale invoice');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Return Handler
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnSale) return;

    const validItems = returnForm.items.filter((i) => Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('Please specify at least one return quantity.');
      return;
    }

    try {
      await api.post(`/sales/${returnSale._id}/return`, {
        items: validItems,
        reason: returnForm.reason,
        refundMethod: returnForm.refundMethod,
      });
      setReturnSale(null);
      loadSales();
      toast.success('Customer return processed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to process return');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Sales & Tax Invoices</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Certified fiscal transaction register, printable jsPDF invoices, payment statuses, and return management.
          </p>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar & Row Limit */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              id="sales-search-input"
              name="search"
              type="text"
              autoComplete="off"
              aria-label="Search sales invoices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice # (e.g. INV-00001), customer name, or phone..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search input"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Status Dropdown */}
          <div className="w-full lg:w-48">
            <select
              id="sales-status-filter"
              name="paymentStatus"
              aria-label="Filter by payment status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid in Full</option>
              <option value="partial">Partial Balance Due</option>
              <option value="unpaid">Unpaid Credit</option>
            </select>
          </div>

          {/* Date Range From */}
          <div className="flex items-center space-x-1.5 text-xs text-[#64748B]">
            <label htmlFor="sales-date-from" className="cursor-pointer">From:</label>
            <input
              id="sales-date-from"
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
            <label htmlFor="sales-date-to" className="cursor-pointer">To:</label>
            <input
              id="sales-date-to"
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
              Showing <strong>{paginatedSales.length}</strong> of <strong>{filteredSales.length}</strong> sales invoices
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
            <label htmlFor="sales-rows-per-page" className="text-[11px] text-[#64748B] cursor-pointer">Rows per page:</label>
            <select
              id="sales-rows-per-page"
              name="rowsPerPage"
              aria-label="Rows per page"
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

      {/* Sales Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table aria-label="Sales and Tax Invoices Register Table" className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th scope="col" className="px-5 py-3.5">Invoice & Date</th>
                <th scope="col" className="px-4 py-3.5">Customer</th>
                <th scope="col" className="px-4 py-3.5">Items</th>
                <th scope="col" className="px-4 py-3.5 text-right">Grand Total</th>
                <th scope="col" className="px-4 py-3.5 text-right">Balance Due</th>
                <th scope="col" className="px-4 py-3.5 text-center">Payment Status</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-[#94A3B8]">
                    <div className="w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading sales register...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[#64748B] mx-auto">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-[#0F172A] text-sm">No Sales Records Found</h4>
                      <p className="text-xs text-[#64748B]">
                        {activeFiltersCount > 0
                          ? 'No sales match your active filter criteria.'
                          : 'No sales have been processed yet. Start by billing orders in Quick Billing.'}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        aria-label={`View Tax Invoice ${sale.invoiceNo}`}
                        onClick={() => setViewSale(sale)}
                        className="font-bold text-[#0F172A] hover:text-blue-600 text-sm transition-colors cursor-pointer text-left group flex items-center space-x-1"
                        title="Click to view Tax Invoice in Chrome Viewer"
                      >
                        <span className="underline decoration-transparent group-hover:decoration-blue-500 underline-offset-2">
                          {sale.invoiceNo}
                        </span>
                      </button>
                      <p className="text-[10px] text-[#64748B]">
                        {new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0F172A]">{sale.customerName || 'Walk-in Customer'}</p>
                      {sale.customerPhone && <p className="text-[10px] text-[#64748B]">{sale.customerPhone}</p>}
                    </td>

                    <td className="px-4 py-4 text-[#64748B]">
                      {sale.items?.length || 0} fragrance lines
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-[#0F172A] text-sm">
                      ₹{sale.grandTotal?.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {sale.balanceDue > 0 ? (
                        <span className="font-bold text-rose-600">₹{sale.balanceDue?.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-[#94A3B8]">₹0</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${
                          sale.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : sale.paymentStatus === 'partial'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Tax Invoice in Chrome Viewer Button */}
                        <button
                          type="button"
                          aria-label={`View Tax Invoice ${sale.invoiceNo}`}
                          onClick={() => setViewSale(sale)}
                          title="View Tax Invoice (All-in-One Chrome Viewer)"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          aria-label={`Edit Tax Invoice ${sale.invoiceNo}`}
                          onClick={() => openEditModal(sale)}
                          title="Edit Invoice"
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          aria-label={`Delete Tax Invoice ${sale.invoiceNo}`}
                          onClick={() => setDeleteSaleItem(sale)}
                          title="Delete Invoice"
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>

                        {/* Return Action */}
                        {sale.status !== 'returned' && (
                          <button
                            type="button"
                            aria-label={`Process customer return for ${sale.invoiceNo}`}
                            onClick={() => {
                              setReturnSale(sale);
                              setReturnForm({
                                items: sale.items?.map((i) => ({
                                  variantId: i.variant,
                                  quantity: 0,
                                  max: i.quantity - (i.returnedQty || 0),
                                  name: i.name,
                                })),
                                reason: 'Customer return',
                                refundMethod: 'cash',
                              });
                            }}
                            title="Process Return"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredSales.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[#E2E8F0] text-xs text-[#64748B] bg-[#F8FAFC]">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                aria-label="Go to previous page"
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
                      aria-label={`Go to page ${page}`}
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
                aria-label="Go to next page"
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

      {/* All-in-One Chrome PDF Invoice Viewer Modal */}
      {viewSale && (
        <InvoiceViewerModal sale={viewSale} onClose={() => setViewSale(null)} />
      )}

      {/* Edit Sale Invoice Modal */}
      {editSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Edit Sales Invoice</h3>
                  <p className="text-[11px] text-[#64748B]">Update client details & payment status for {editSale.invoiceNo}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close edit sales invoice modal"
                onClick={() => setEditSale(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-sale-cust-name" className="block font-medium text-[#334155] mb-1">Customer Name</label>
                  <input
                    id="edit-sale-cust-name"
                    name="customerName"
                    type="text"
                    autoComplete="name"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-sale-cust-phone" className="block font-medium text-[#334155] mb-1">Customer Phone</label>
                  <input
                    id="edit-sale-cust-phone"
                    name="customerPhone"
                    type="text"
                    autoComplete="tel"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-sale-payment-status" className="block font-medium text-[#334155] mb-1">Payment Status *</label>
                  <select
                    id="edit-sale-payment-status"
                    name="paymentStatus"
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] uppercase focus:outline-none focus:border-blue-500"
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="partial">Partial Balance Due</option>
                    <option value="unpaid">Unpaid Credit</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-sale-payment-method" className="block font-medium text-[#334155] mb-1">Payment Method</label>
                  <select
                    id="edit-sale-payment-method"
                    name="paymentMethod"
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="upi">UPI / QR</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-sale-notes" className="block font-medium text-[#334155] mb-1">Invoice Notes</label>
                <textarea
                  id="edit-sale-notes"
                  name="notes"
                  rows="2"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Additional order or shipping remarks..."
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditSale(null)}
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

      {/* Delete Sale Invoice Confirmation Modal */}
      {deleteSaleItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Delete Sales Invoice?</h3>
                <p className="text-xs text-[#64748B]">This invoice voucher will be permanently removed</p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1 text-xs mb-4">
              <p className="font-bold text-[#0F172A]">{deleteSaleItem.invoiceNo} &mdash; ₹{deleteSaleItem.grandTotal?.toLocaleString('en-IN')}</p>
              <p className="text-[#64748B]">Client: <span className="font-medium text-[#0F172A]">{deleteSaleItem.customerName || 'Walk-in'}</span></p>
              <p className="text-[#64748B]">Date: <span className="text-[#0F172A]">{new Date(deleteSaleItem.saleDate).toLocaleDateString()}</span></p>
              <p className="text-rose-600 text-[11px] font-medium pt-1">
                Warning: Removing this sale will void the accounting entry in the fiscal ledger.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteSaleItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSale}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {returnSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Process Customer Return</h3>
                <p className="text-[11px] text-[#64748B]">Original Invoice: {returnSale.invoiceNo}</p>
              </div>
              <button
                type="button"
                aria-label="Close customer return modal"
                onClick={() => setReturnSale(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4 mt-4 text-xs">
              <div className="space-y-2">
                <span className="block font-bold text-[#334155]">Specify Return Quantities</span>
                {returnForm.items.map((item, idx) => (
                  <div key={item.variantId} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className="font-medium text-[#0F172A] truncate max-w-[200px]">{item.name}</span>
                    <div className="flex items-center space-x-1">
                      <input
                        id={`return-qty-${idx}`}
                        name={`returnQty_${idx}`}
                        aria-label={`Return quantity for ${item.name}`}
                        type="number"
                        min="0"
                        max={item.max}
                        autoComplete="off"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value), item.max);
                          const updated = [...returnForm.items];
                          updated[idx].quantity = val;
                          setReturnForm({ ...returnForm, items: updated });
                        }}
                        className="w-16 px-2 py-1 bg-white border border-[#CBD5E1] rounded text-right font-bold text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                      <span className="text-[#64748B]">/ {item.max}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="sales-return-reason" className="block font-medium text-[#334155] mb-1">Reason for Return</label>
                <input
                  id="sales-return-reason"
                  name="reason"
                  type="text"
                  autoComplete="off"
                  required
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label htmlFor="sales-return-method" className="block font-medium text-[#334155] mb-1">Refund Method</label>
                <select
                  id="sales-return-method"
                  name="refundMethod"
                  value={returnForm.refundMethod}
                  onChange={(e) => setReturnForm({ ...returnForm, refundMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="cash">Cash Refund</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="credit">Store Credit Balance</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setReturnSale(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Return & Reverse Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
