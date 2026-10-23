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

  // Edit Movement State
  const [editMovementItem, setEditMovementItem] = useState(null);
  const [editMovementForm, setEditMovementForm] = useState({
    reason: '',
    batchNo: '',
    type: 'adjustment_in',
  });
  const [editMovementSaving, setEditMovementSaving] = useState(false);

  // Delete Movement State
  const [deleteMovementItem, setDeleteMovementItem] = useState(null);
  const [deleteMovementLoading, setDeleteMovementLoading] = useState(false);

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

  const openEditMovementModal = (m) => {
    setEditMovementItem(m);
    setEditMovementForm({
      reason: m.reason || '',
      batchNo: m.batchNo || '',
      type: m.type || 'adjustment_in',
    });
  };

  const handleEditMovementSubmit = async (e) => {
    e.preventDefault();
    if (!editMovementItem) return;
    setEditMovementSaving(true);
    try {
      await api.put(`/inventory/movements/${editMovementItem._id}`, editMovementForm);
      toast.success('Movement record updated successfully');
      setEditMovementItem(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update movement');
    } finally {
      setEditMovementSaving(false);
    }
  };

  const handleDeleteMovementConfirm = async () => {
    if (!deleteMovementItem) return;
    setDeleteMovementLoading(true);
    try {
      await api.delete(`/inventory/movements/${deleteMovementItem._id}`);
      toast.success('Movement record deleted successfully');
      setDeleteMovementItem(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete movement');
    } finally {
      setDeleteMovementLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header — Clean & Simple */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Inventory & Stock
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View stock balances and record inventory adjustments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdjustModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Stock Adjustment</span>
        </button>
      </div>

      {/* Clean Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`px-3 py-2 font-medium transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'levels'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Stock Levels ({stockLevels.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-2 font-medium transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Movement Ledger ({movements.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab === 'levels' && (
        <div className="flex flex-col sm:flex-row items-center gap-2.5 text-xs">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <label htmlFor="inventory-search-input" className="sr-only">Search stock</label>
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              id="inventory-search-input"
              name="search"
              type="text"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by perfume, SKU, or batch..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-40">
            <select
              id="inventory-status-filter"
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="">All Status</option>
              <option value="optimal">In Stock (Optimal)</option>
              <option value="low">Low Stock (≤ min)</option>
              <option value="out">Out of Stock (0)</option>
            </select>
          </div>

          {/* Rows Selector */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto text-slate-500 whitespace-nowrap">
            <span>Rows:</span>
            <select
              id="inventory-rows-per-page"
              name="rowsPerPage"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {(search || selectedStatus) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:underline whitespace-nowrap cursor-pointer self-start sm:self-auto py-1"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading inventory records...
        </div>
      ) : activeTab === 'levels' ? (
        filteredLevels.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-6">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No stock balances found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No inventory records matched your filters.
            </p>
            {(search || selectedStatus) && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table aria-label="Inventory Stock Balances Table" className="w-full text-left text-xs">
                  <caption className="sr-only">Inventory Stock Balances Register</caption>
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                    <tr>
                      <th scope="col" className="px-4 py-3">Perfume & SKU</th>
                      <th scope="col" className="px-4 py-3">Batch / Expiry</th>
                      <th scope="col" className="px-4 py-3 text-right">Qty</th>
                      <th scope="col" className="px-4 py-3 text-right">Price</th>
                      <th scope="col" className="px-4 py-3 text-center">Status</th>
                      <th scope="col" className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLevels.map((lvl) => (
                      <tr key={lvl._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{lvl.variant?.product?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{lvl.variant?.sku} &bull; {lvl.variant?.sizeMl}ml {lvl.variant?.concentration}</p>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          <p className="font-medium text-slate-700">{lvl.batchNo || 'Default'}</p>
                          {lvl.expiryDate && (
                            <p className="text-[10px] text-slate-400">Exp: {new Date(lvl.expiryDate).toLocaleDateString()}</p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-slate-900">{lvl.quantity}</span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <p className="font-medium text-slate-900">₹{lvl.variant?.retailPrice?.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-400">Cost: ₹{lvl.variant?.purchaseCost?.toLocaleString('en-IN')}</p>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {lvl.quantity <= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-rose-50 text-rose-700">
                              Out of Stock
                            </span>
                          ) : lvl.quantity <= (lvl.variant?.minStock || 5) ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-amber-50 text-amber-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-emerald-50 text-emerald-700">
                              In Stock
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              aria-label={`Edit stock for ${lvl.variant?.product?.name || 'item'}`}
                              onClick={() => openEditModal(lvl)}
                              title="Edit Stock"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete stock for ${lvl.variant?.product?.name || 'item'}`}
                              onClick={() => setDeleteItem(lvl)}
                              title="Delete Record"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-slate-500">
              <p>
                Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong>–
                <strong>{Math.min(currentPage * rowsPerPage, filteredLevels.length)}</strong> of{' '}
                <strong>{filteredLevels.length}</strong> items
              </p>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          aria-label={`Go to page ${p}`}
                          onClick={() => setCurrentPage(p)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                            currentPage === p
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
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
                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table aria-label="Audit Movement Ledger Table" className="w-full text-left text-xs">
              <caption className="sr-only">Audit Movement Ledger Register</caption>
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Item</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Change</th>
                  <th scope="col" className="px-4 py-3 text-right">Balance</th>
                  <th scope="col" className="px-4 py-3">Reason</th>
                  <th scope="col" className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-medium text-slate-800">{new Date(m.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleTimeString()}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.product?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.variant?.sku}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">
                        {m.type?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {m.balanceAfter}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      <p>{m.reason}</p>
                      {m.refNumber && <p className="text-[10px] text-slate-400 font-mono">{m.refNumber}</p>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          aria-label={`Edit movement for ${m.product?.name || 'item'}`}
                          onClick={() => openEditMovementModal(m)}
                          title="Edit Movement"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete movement for ${m.product?.name || 'item'}`}
                          onClick={() => setDeleteMovementItem(m)}
                          title="Delete Movement"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* Edit Movement Modal */}
      {editMovementItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Movement Record</h3>
                <p className="text-xs text-slate-500">
                  {editMovementItem.product?.name} ({editMovementItem.variant?.sku})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit movement modal"
                onClick={() => setEditMovementItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMovementSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-mov-type" className="block font-medium text-slate-700 mb-1">Movement Type</label>
                <select
                  id="edit-mov-type"
                  name="type"
                  value={editMovementForm.type}
                  onChange={(e) => setEditMovementForm({ ...editMovementForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="adjustment_in">Correction (Stock In +)</option>
                  <option value="adjustment_out">Correction (Stock Out -)</option>
                  <option value="damaged">Damaged Bottle</option>
                  <option value="leaked">Leaked Fragrance</option>
                  <option value="lost">Lost / Missing</option>
                  <option value="expired">Expired Tester/Stock</option>
                  <option value="opening">Opening Stock</option>
                  <option value="purchase_receipt">Purchase Receipt</option>
                  <option value="sale">Sale</option>
                  <option value="sale_return">Sale Return</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-mov-batch" className="block font-medium text-slate-700 mb-1">Batch / Reference</label>
                <input
                  id="edit-mov-batch"
                  name="batchNo"
                  type="text"
                  autoComplete="off"
                  value={editMovementForm.batchNo}
                  onChange={(e) => setEditMovementForm({ ...editMovementForm, batchNo: e.target.value })}
                  placeholder="e.g. BATCH-2026-A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="edit-mov-reason" className="block font-medium text-slate-700 mb-1">Reason / Notes *</label>
                <textarea
                  id="edit-mov-reason"
                  name="reason"
                  rows="3"
                  required
                  value={editMovementForm.reason}
                  onChange={(e) => setEditMovementForm({ ...editMovementForm, reason: e.target.value })}
                  placeholder="Audit reason or notes..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditMovementItem(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMovementSaving}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {editMovementSaving ? 'Saving...' : 'Save Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Movement Confirmation Modal */}
      {deleteMovementItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-rose-600 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Delete Movement Record</span>
              </h3>
              <button
                type="button"
                aria-label="Close delete movement modal"
                onClick={() => setDeleteMovementItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-700">
              <p>
                Are you sure you want to delete this movement record for{' '}
                <strong>{deleteMovementItem.product?.name}</strong> ({deleteMovementItem.variant?.sku})?
              </p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p>Movement Type: <strong className="uppercase">{deleteMovementItem.type?.replace('_', ' ')}</strong></p>
                <p>Quantity Change: <strong>{deleteMovementItem.quantity > 0 ? `+${deleteMovementItem.quantity}` : deleteMovementItem.quantity} units</strong></p>
                <p>Reason: <strong>{deleteMovementItem.reason || 'None'}</strong></p>
                <p className="text-[10px] text-slate-400">Date: {new Date(deleteMovementItem.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-[11px] text-slate-500">
                Deleting this ledger entry will adjust the corresponding stock balance to keep inventory in sync.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteMovementItem(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMovementConfirm}
                disabled={deleteMovementLoading}
                className="px-4 py-2 rounded-lg font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deleteMovementLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
