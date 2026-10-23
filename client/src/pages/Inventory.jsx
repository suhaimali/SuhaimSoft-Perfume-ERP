import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  Plus,
  Shuffle,
  Search,
  Filter,
  History,
  CheckCircle,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('levels');
  const [stockLevels, setStockLevels] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination / Row Limit
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit Stock State
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    batchNo: '',
    expiryDate: '',
    warehouseId: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete Stock State
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Adjustment state
  const [adjData, setAdjData] = useState({
    variantId: '',
    warehouseId: '',
    quantity: 1,
    type: 'damaged',
    reason: 'Bottle seal broken during unboxing',
  });

  const loadInventory = () => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/levels?limit=500'),
      api.get('/inventory/movements?limit=200'),
      api.get('/warehouses'),
    ])
      .then(([lvlRes, movRes, whRes]) => {
        setStockLevels(lvlRes.data.data.items || []);
        setMovements(movRes.data.data.items || []);
        const whs = whRes.data.data.warehouses || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          setAdjData((prev) => ({ ...prev, warehouseId: whs[0]._id }));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered Stock Levels
  const filteredLevels = useMemo(() => {
    return stockLevels.filter((lvl) => {
      const q = search.toLowerCase().trim();
      const productName = lvl.variant?.product?.name?.toLowerCase() || '';
      const sku = lvl.variant?.sku?.toLowerCase() || '';
      const batch = lvl.batchNo?.toLowerCase() || '';
      const matchesSearch = !q || productName.includes(q) || sku.includes(q) || batch.includes(q);

      let matchesStatus = true;
      const minStock = lvl.variant?.minStock || 5;
      if (selectedStatus === 'out') {
        matchesStatus = lvl.quantity <= 0;
      } else if (selectedStatus === 'low') {
        matchesStatus = lvl.quantity > 0 && lvl.quantity <= minStock;
      } else if (selectedStatus === 'optimal') {
        matchesStatus = lvl.quantity > minStock;
      }

      return matchesSearch && matchesStatus;
    });
  }, [stockLevels, search, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLevels.length / rowsPerPage) || 1;
  const paginatedLevels = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLevels.slice(start, start + rowsPerPage);
  }, [filteredLevels, currentPage, rowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, rowsPerPage]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjustments', adjData);
      toast.success('Stock inventory adjusted successfully');
      setShowAdjustModal(false);
      setAdjData({ variantId: '', warehouseId: '', quantity: 1, type: 'damaged', reason: '' });
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to adjust stock');
    }
  };

  const openEditModal = (lvl) => {
    setEditItem(lvl);
    setEditForm({
      quantity: lvl.quantity,
      batchNo: lvl.batchNo || '',
      expiryDate: lvl.expiryDate ? lvl.expiryDate.slice(0, 10) : '',
      warehouseId: lvl.warehouse?._id || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    try {
      await api.put(`/inventory/levels/${editItem._id}`, editForm);
      toast.success('Stock level updated successfully');
      setEditItem(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update stock level');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/inventory/levels/${deleteItem._id}`);
      toast.success('Stock level record deleted successfully');
      setDeleteItem(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete stock level');
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Inventory & Stock Balances</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time multi-warehouse stock levels, physical adjustments, and immutable movement ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] shadow-xs cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-slate-700" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Responsive Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'levels'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Levels ({stockLevels.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Movement Ledger ({movements.length})</span>
        </button>
      </div>

      {/* Levels Tab Controls: Search, Filters, Row Limit */}
      {activeTab === 'levels' && (
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <label htmlFor="inventory-search-input" className="sr-only">Search stock balances</label>
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#94A3B8]" />
              <input
                id="inventory-search-input"
                name="search"
                type="text"
                autoComplete="off"
                aria-label="Search by perfume name, SKU code, or batch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by perfume name, SKU code, or batch..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Stock Status Filter */}
            <div className="w-full sm:w-44">
              <label htmlFor="inventory-status-filter" className="sr-only">Filter by stock status</label>
              <select
                id="inventory-status-filter"
                name="status"
                aria-label="Filter by stock status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              >
                <option value="">All Stock Status</option>
                <option value="optimal">In Stock (Optimal)</option>
                <option value="low">Low Stock (≤ min)</option>
                <option value="out">Out of Stock (0)</option>
              </select>
            </div>

            {/* Row Limit Selector */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label htmlFor="inventory-rows-per-page" className="text-xs text-[#64748B] whitespace-nowrap">Rows:</label>
              <select
                id="inventory-rows-per-page"
                name="rowsPerPage"
                aria-label="Rows per page"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-2.5 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Active filter tags */}
          {(search || selectedStatus) && (
            <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-xs">
              <span className="text-[#64748B]">
                Found <strong>{filteredLevels.length}</strong> matching stock records
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#94A3B8]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading inventory records...
        </div>
      ) : activeTab === 'levels' ? (
        filteredLevels.length === 0 ? (
          /* Empty State / Not Found Card */
          <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto mb-3">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">No Stock Balances Found</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              No inventory records matched your search query or selected filters. Try adjusting your filters or recording a new stock adjustment.
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              {(search || selectedStatus) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] shadow-xs cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAdjustModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Stock Adjustment</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table aria-label="Inventory Stock Balances Table" className="w-full text-left text-xs">
                  <caption className="sr-only">Inventory Stock Balances Register</caption>
                  <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">Perfume & SKU</th>
                      <th scope="col" className="px-4 py-3.5">Batch / Expiry</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Available Qty</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Unit Value</th>
                      <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {paginatedLevels.map((lvl) => (
                      <tr key={lvl._id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-[#0F172A]">{lvl.variant?.product?.name}</p>
                          <p className="text-[11px] text-blue-600 font-semibold">{lvl.variant?.sku} &bull; {lvl.variant?.sizeMl}ml {lvl.variant?.concentration}</p>
                        </td>

                        <td className="px-4 py-4 text-[#64748B]">
                          <p className="font-medium text-[#334155]">{lvl.batchNo || 'Default Batch'}</p>
                          {lvl.expiryDate && (
                            <p className="text-[10px] text-[#94A3B8]">Exp: {new Date(lvl.expiryDate).toLocaleDateString()}</p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-base text-[#0F172A]">{lvl.quantity}</span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p className="font-semibold text-emerald-700">₹{lvl.variant?.retailPrice?.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-[#94A3B8]">Cost: ₹{lvl.variant?.purchaseCost?.toLocaleString('en-IN')}</p>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {lvl.quantity <= 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : lvl.quantity <= (lvl.variant?.minStock || 5) ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Optimal
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              aria-label={`Edit stock for ${lvl.variant?.product?.name || 'item'}`}
                              onClick={() => openEditModal(lvl)}
                              title="Edit Stock Level"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 transition-colors shadow-xs cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete stock for ${lvl.variant?.product?.name || 'item'}`}
                              onClick={() => setDeleteItem(lvl)}
                              title="Delete Stock Record"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors shadow-xs cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-[#64748B]">
              <p>
                Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * rowsPerPage, filteredLevels.length)}</strong> of{' '}
                <strong>{filteredLevels.length}</strong> items
              </p>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span className="px-1 text-[#94A3B8]">...</span>}
                        <button
                          type="button"
                          aria-label={`Go to page ${p}`}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                            currentPage === p
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table aria-label="Audit Movement Ledger Table" className="w-full text-left text-xs">
              <caption className="sr-only">Audit Movement Ledger Register</caption>
              <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Timestamp</th>
                  <th scope="col" className="px-4 py-3.5">Fragrance Item</th>
                  <th scope="col" className="px-4 py-3.5">Movement Type</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Change</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Balance After</th>
                  <th scope="col" className="px-4 py-3.5">Reference / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {movements.map((m) => (
                  <tr key={m._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3 text-[#64748B]">
                      <p className="font-medium text-[#0F172A]">{new Date(m.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-[#94A3B8]">{new Date(m.createdAt).toLocaleTimeString()}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0F172A]">{m.product?.name}</p>
                      <p className="text-[10px] text-[#64748B]">{m.variant?.sku}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] uppercase">
                        {m.type?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-[#0F172A]">
                      {m.balanceAfter}
                    </td>

                    <td className="px-4 py-3 text-[#64748B]">
                      <p>{m.reason}</p>
                      {m.refNumber && <p className="text-[10px] text-slate-500 font-semibold">{m.refNumber}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Edit Stock Record</h3>
                <p className="text-xs text-[#64748B]">
                  {editItem.variant?.product?.name} ({editItem.variant?.sku})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit stock modal"
                onClick={() => setEditItem(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-stock-qty" className="block font-medium text-[#334155] mb-1">Available Quantity (Bottles) *</label>
                <input
                  id="edit-stock-qty"
                  name="quantity"
                  type="number"
                  autoComplete="off"
                  required
                  min="0"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-stock-batch" className="block font-medium text-[#334155] mb-1">Batch Number</label>
                  <input
                    id="edit-stock-batch"
                    name="batchNo"
                    type="text"
                    autoComplete="off"
                    value={editForm.batchNo}
                    onChange={(e) => setEditForm({ ...editForm, batchNo: e.target.value })}
                    placeholder="e.g. BATCH-2026-A"
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="edit-stock-expiry" className="block font-medium text-[#334155] mb-1">Expiry Date</label>
                  <input
                    id="edit-stock-expiry"
                    name="expiryDate"
                    type="date"
                    autoComplete="off"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Stock Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Stock Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-rose-600 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Delete Stock Record</span>
              </h3>
              <button
                type="button"
                aria-label="Close delete stock modal"
                onClick={() => setDeleteItem(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs text-[#334155]">
              <p>
                Are you sure you want to delete this inventory record for{' '}
                <strong>{deleteItem.variant?.product?.name}</strong> ({deleteItem.variant?.sku})?
              </p>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <p>Location: <strong>{deleteItem.warehouse?.name}</strong></p>
                <p>Current Quantity: <strong>{deleteItem.quantity} bottles</strong></p>
                <p>Batch: <strong>{deleteItem.batchNo || 'Default'}</strong></p>
              </div>
              <p className="text-[11px] text-[#64748B]">
                This will deduct {deleteItem.quantity} units from active inventory and record an audit transaction.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span>Record Stock Adjustment</span>
              </h3>
              <button
                type="button"
                aria-label="Close adjustment modal"
                onClick={() => setShowAdjustModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="adjust-variant-id" className="block font-medium text-[#334155] mb-1">Product Variant *</label>
                <select
                  id="adjust-variant-id"
                  name="variantId"
                  required
                  value={adjData.variantId}
                  onChange={(e) => setAdjData({ ...adjData, variantId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select Variant to Adjust</option>
                  {stockLevels.map((lvl) => (
                     <option key={lvl._id} value={lvl.variant?._id}>
                      {lvl.variant?.product?.name} ({lvl.variant?.sku}) - Current Stock: {lvl.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="adjust-type" className="block font-medium text-[#334155] mb-1">Adjustment Type *</label>
                  <select
                    id="adjust-type"
                    name="type"
                    value={adjData.type}
                    onChange={(e) => setAdjData({ ...adjData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                  >
                    <option value="damaged">Damaged Bottle</option>
                    <option value="leaked">Leaked Fragrance</option>
                    <option value="lost">Lost / Missing</option>
                    <option value="expired">Expired Tester/Stock</option>
                    <option value="adjustment_in">Correction (Stock In +)</option>
                    <option value="adjustment_out">Correction (Stock Out -)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="adjust-quantity" className="block font-medium text-[#334155] mb-1">Quantity *</label>
                  <input
                    id="adjust-quantity"
                    name="quantity"
                    type="number"
                    autoComplete="off"
                    required
                    min="1"
                    value={adjData.quantity}
                    onChange={(e) => setAdjData({ ...adjData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adjust-reason" className="block font-medium text-[#334155] mb-1">Reason / Notes</label>
                <textarea
                  id="adjust-reason"
                  name="reason"
                  rows="2"
                  value={adjData.reason}
                  onChange={(e) => setAdjData({ ...adjData, reason: e.target.value })}
                  placeholder="Details of audit or breakage..."
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
