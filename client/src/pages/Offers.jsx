import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  CheckCircle,
  Percent,
  DollarSign,
  X,
  Edit2,
  Trash2,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Offers() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Coupon Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'percent',
    value: 10,
    minPurchase: 5000,
    maxDiscount: 2000,
    description: '',
  });

  // Edit Coupon Modal
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    discountType: 'percent',
    value: 10,
    minPurchase: 0,
    maxDiscount: '',
    description: '',
    isActive: true,
  });

  const loadCoupons = () => {
    setLoading(true);
    api.get('/coupons')
      .then((res) => setCoupons(res.data.data.coupons || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons', {
        ...form,
        value: Number(form.value),
        minPurchase: Number(form.minPurchase),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      });
      setShowModal(false);
      setForm({ code: '', name: '', discountType: 'percent', value: 10, minPurchase: 5000, maxDiscount: 2000, description: '' });
      toast.success('Coupon created successfully');
      loadCoupons();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save coupon');
    }
  };

  const openEditModal = (c) => {
    setEditingCoupon(c);
    setEditForm({
      name: c.name || '',
      discountType: c.discountType || 'percent',
      value: c.value != null ? c.value : 10,
      minPurchase: c.minPurchase || 0,
      maxDiscount: c.maxDiscount || '',
      description: c.description || '',
      isActive: c.isActive !== false,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCoupon) return;
    try {
      await api.put(`/coupons/${editingCoupon._id}`, {
        ...editForm,
        value: Number(editForm.value),
        minPurchase: Number(editForm.minPurchase),
        maxDiscount: editForm.maxDiscount ? Number(editForm.maxDiscount) : undefined,
      });
      setEditingCoupon(null);
      toast.success('Coupon updated successfully');
      loadCoupons();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update coupon');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success(`Coupon "${code}" deleted`);
      loadCoupons();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (c) => {
    try {
      await api.put(`/coupons/${c._id}`, { isActive: !c.isActive });
      toast.success(`Coupon "${c.code}" ${c.isActive ? 'deactivated' : 'activated'}`);
      loadCoupons();
    } catch (err) {
      toast.error('Failed to change coupon status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Discounts, Coupons & Loyalty Promotions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage seasonal coupon codes, cart discounts, fragrance promotions, and voucher redemption.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Coupon Code</span>
        </button>
      </div>

      {/* OFFERS & COUPONS DATA TABLE WITH ACTION BUTTONS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table aria-label="Discounts and Loyalty Coupons Table" className="w-full text-left text-xs text-slate-700">
            <caption className="sr-only">Discounts, Coupons and Loyalty Promotions Register</caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4">Coupon Code</th>
                <th scope="col" className="py-3 px-4">Promotion Name</th>
                <th scope="col" className="py-3 px-4">Discount</th>
                <th scope="col" className="py-3 px-4 text-right">Min Purchase</th>
                <th scope="col" className="py-3 px-4 text-right">Max Discount Cap</th>
                <th scope="col" className="py-3 px-4 text-right">Times Used</th>
                <th scope="col" className="py-3 px-4 text-center">Status</th>
                <th scope="col" className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading promotional coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No active coupons found. Click "+ New Coupon Code" above.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{c.name}</div>
                      {c.description && <div className="text-[11px] font-normal text-slate-400">{c.description}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600">
                      {c.discountType === 'percent' ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      ₹{(c.minPurchase || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {c.maxDiscount ? `₹${c.maxDiscount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                      {c.usedCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        aria-label={`Toggle active status for ${c.code}`}
                        onClick={() => handleToggleStatus(c)}
                        title="Click to toggle status"
                        className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase transition-colors cursor-pointer ${
                          c.isActive !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-slate-500 bg-slate-100 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {c.isActive !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          aria-label={`Edit coupon ${c.code}`}
                          onClick={() => openEditModal(c)}
                          title="Edit Coupon"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete coupon ${c.code}`}
                          onClick={() => handleDelete(c._id, c.code)}
                          title="Delete Coupon"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Promotional Coupon</h3>
              <button type="button" aria-label="Close create coupon modal" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="add-coupon-code" className="block font-medium text-slate-700 mb-1">Coupon Code (Uppercase) *</label>
                <input
                  id="add-coupon-code"
                  name="code"
                  type="text"
                  required
                  autoComplete="off"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  placeholder="e.g. FESTIVE25"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
                />
              </div>

              <div>
                <label htmlFor="add-coupon-name" className="block font-medium text-slate-700 mb-1">Promotion Name *</label>
                <input
                  id="add-coupon-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="off"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Festival Season Luxury Discount"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-coupon-type" className="block font-medium text-slate-700 mb-1">Discount Type</label>
                  <select
                    id="add-coupon-type"
                    name="discountType"
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-coupon-value" className="block font-medium text-slate-700 mb-1">
                    Value ({form.discountType === 'percent' ? '%' : '₹'}) *
                  </label>
                  <input
                    id="add-coupon-value"
                    name="value"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-coupon-min" className="block font-medium text-slate-700 mb-1">Min Cart Purchase (₹)</label>
                  <input
                    id="add-coupon-min"
                    name="minPurchase"
                    type="number"
                    min="0"
                    autoComplete="off"
                    value={form.minPurchase}
                    onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="add-coupon-max" className="block font-medium text-slate-700 mb-1">Max Cap (₹, optional)</label>
                  <input
                    id="add-coupon-max"
                    name="maxDiscount"
                    type="number"
                    min="0"
                    autoComplete="off"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Coupon</h3>
                <p className="text-[11px] text-slate-500 font-mono">Code: {editingCoupon.code}</p>
              </div>
              <button type="button" aria-label="Close edit coupon modal" onClick={() => setEditingCoupon(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-coupon-name" className="block font-medium text-slate-700 mb-1">Promotion Name *</label>
                <input
                  id="edit-coupon-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="off"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-coupon-type" className="block font-medium text-slate-700 mb-1">Discount Type</label>
                  <select
                    id="edit-coupon-type"
                    name="discountType"
                    value={editForm.discountType}
                    onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-coupon-value" className="block font-medium text-slate-700 mb-1">
                    Value ({editForm.discountType === 'percent' ? '%' : '₹'}) *
                  </label>
                  <input
                    id="edit-coupon-value"
                    name="value"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-coupon-min" className="block font-medium text-slate-700 mb-1">Min Cart Purchase (₹)</label>
                  <input
                    id="edit-coupon-min"
                    name="minPurchase"
                    type="number"
                    min="0"
                    autoComplete="off"
                    value={editForm.minPurchase}
                    onChange={(e) => setEditForm({ ...editForm, minPurchase: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-coupon-max" className="block font-medium text-slate-700 mb-1">Max Cap (₹, optional)</label>
                  <input
                    id="edit-coupon-max"
                    name="maxDiscount"
                    type="number"
                    min="0"
                    autoComplete="off"
                    value={editForm.maxDiscount}
                    onChange={(e) => setEditForm({ ...editForm, maxDiscount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="couponActive"
                  name="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="couponActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Coupon is active for store and retail billing
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
