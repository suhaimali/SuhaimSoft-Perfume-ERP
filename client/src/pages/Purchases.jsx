import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle, Clock, Truck, Eye, AlertCircle, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [receivingPO, setReceivingPO] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});

  // PO form state
  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: '',
    items: [{ variantId: '', quantity: 10, unitCost: 15000 }],
    additionalCosts: 0,
    notes: '',
  });

  const loadPurchases = () => {
    setLoading(true);
    api.get('/purchases?limit=50')
      .then((res) => setPurchases(res.data.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPurchases();
    api.get('/suppliers').then((res) => setSuppliers(res.data.data.items || []));
    api.get('/warehouses').then((res) => {
      const whs = res.data.data.warehouses || [];
      setWarehouses(whs);
      if (whs.length > 0) {
        setPoForm((prev) => ({ ...prev, warehouseId: whs[0]._id }));
      }
    });
    api.get('/products?limit=100').then((res) => {
      const vars = (res.data.data.items || []).flatMap((p) => p.variants || []);
      setVariants(vars);
    });
  }, []);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      await api.post('/purchases', poForm);
      setShowCreateModal(false);
      setPoForm({
        supplierId: '',
        warehouseId: warehouses[0]?._id || '',
        items: [{ variantId: '', quantity: 10, unitCost: 15000 }],
        additionalCosts: 0,
        notes: '',
      });
      loadPurchases();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create PO');
    }
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!receivingPO) return;

    const itemsToReceive = Object.entries(receiveQtys)
      .map(([variantId, qty]) => ({ variantId, quantity: Number(qty) }))
      .filter((i) => i.quantity > 0);

    if (itemsToReceive.length === 0) {
      alert('Please enter a valid quantity to receive.');
      return;
    }

    try {
      await api.post(`/purchases/${receivingPO._id}/receive`, { items: itemsToReceive });
      setReceivingPO(null);
      setReceiveQtys({});
      loadPurchases();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to receive goods');
    }
  };

  const handleDeletePO = async (id, number) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order "${number}"?`)) {
      return;
    }
    try {
      await api.delete(`/purchases/${id}`);
      toast.success(`Purchase Order ${number} deleted`);
      loadPurchases();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete purchase order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Purchase Orders & Supplier Invoices</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Complete procurement workflow: create PO, receive shipments, track supplier dues, and update stock.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table aria-label="Purchase Orders and Supplier Invoices Table" className="w-full text-left text-xs">
            <caption className="sr-only">Purchase Orders and Invoices Register</caption>
            <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th scope="col" className="px-5 py-3.5">PO Number & Date</th>
                <th scope="col" className="px-4 py-3.5">Supplier</th>
                <th scope="col" className="px-4 py-3.5 text-right">Order Value</th>
                <th scope="col" className="px-4 py-3.5 text-right">Received Value</th>
                <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                <th scope="col" className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#94A3B8]">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#94A3B8]">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0F172A] text-sm">{po.number}</p>
                      <p className="text-[10px] text-[#64748B]">{new Date(po.orderDate).toLocaleDateString()}</p>
                    </td>

                    <td className="px-4 py-4 text-[#0F172A] font-medium">
                      {po.supplier?.name}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-[#0F172A]">
                      ₹{po.grandTotal?.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                      ₹{po.receivedValue?.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ${
                        po.status === 'received'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : po.status === 'partially_received'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {po.status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {po.status !== 'received' && po.status !== 'cancelled' ? (
                          <button
                            type="button"
                            aria-label={`Receive goods for order ${po.number}`}
                            onClick={() => {
                              setReceivingPO(po);
                              const defaults = {};
                              po.items?.forEach((i) => {
                                defaults[i.variant] = i.quantity - (i.receivedQty || 0);
                              });
                              setReceiveQtys(defaults);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Receive Goods
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 px-2">Complete</span>
                        )}

                        <button
                          type="button"
                          aria-label={`Delete purchase order ${po.number}`}
                          onClick={() => handleDeletePO(po._id, po.number)}
                          title="Delete Purchase Order"
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

      {/* Receive Goods Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Receive Goods - {receivingPO.number}</h3>
                <p className="text-xs text-[#64748B]">Update stock counts for quantities received into {receivingPO.warehouse?.name}</p>
              </div>
              <button
                type="button"
                aria-label="Close receive goods modal"
                onClick={() => setReceivingPO(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4 mt-4 text-xs">
              <div className="space-y-3">
                {receivingPO.items?.map((item) => {
                  const pending = item.quantity - (item.receivedQty || 0);
                  const fieldId = `receive-qty-${item.variant}`;
                  return (
                    <div key={item.variant} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#0F172A]">{item.name}</p>
                        <p className="text-[10px] text-[#64748B]">
                          Ordered: {item.quantity} | Already Received: {item.receivedQty || 0}
                        </p>
                      </div>
                      <div className="w-24">
                        <label htmlFor={fieldId} className="block text-[10px] text-[#64748B] mb-0.5 font-medium">Receive Now</label>
                        <input
                          id={fieldId}
                          name={`receive_${item.variant}`}
                          type="number"
                          autoComplete="off"
                          max={pending}
                          min="0"
                          value={receiveQtys[item.variant] ?? pending}
                          onChange={(e) => setReceiveQtys({ ...receiveQtys, [item.variant]: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-[#0F172A] text-right font-bold focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Confirm Stock Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>Create Purchase Order (PO)</span>
              </h3>
              <button
                type="button"
                aria-label="Close create purchase order modal"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 mt-4 text-xs">
                <div>
                  <label htmlFor="po-supplier-select" className="block font-medium text-[#334155] mb-1">Supplier *</label>
                  <select
                    id="po-supplier-select"
                    name="supplierId"
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.company || 'Distributor'})</option>
                    ))}
                  </select>
                </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <span className="block font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">Fragrance Items</span>
                {poForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                    <div className="sm:col-span-3">
                      <label htmlFor={`po-item-${idx}-variant`} className="sr-only">Variant</label>
                      <select
                        id={`po-item-${idx}-variant`}
                        name={`po_item_${idx}_variant`}
                        aria-label={`Item ${idx + 1} variant`}
                        required
                        value={item.variantId}
                        onChange={(e) => {
                          const updated = [...poForm.items];
                          updated[idx].variantId = e.target.value;
                          const found = variants.find((v) => v._id === e.target.value);
                          if (found) updated[idx].unitCost = found.purchaseCost;
                          setPoForm({ ...poForm, items: updated });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] text-xs focus:outline-none focus:border-blue-600"
                      >
                        <option value="">Select Variant</option>
                        {variants.map((v) => (
                          <option key={v._id} value={v._id}>{v.name || v.sku} (Cost: ₹{v.purchaseCost})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`po-item-${idx}-qty`} className="sr-only">Quantity</label>
                      <input
                        id={`po-item-${idx}-qty`}
                        name={`po_item_${idx}_qty`}
                        type="number"
                        autoComplete="off"
                        aria-label={`Item ${idx + 1} quantity`}
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...poForm.items];
                          updated[idx].quantity = e.target.value;
                          setPoForm({ ...poForm, items: updated });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label htmlFor={`po-item-${idx}-cost`} className="sr-only">Cost</label>
                      <input
                        id={`po-item-${idx}-cost`}
                        name={`po_item_${idx}_cost`}
                        type="number"
                        autoComplete="off"
                        aria-label={`Item ${idx + 1} unit cost`}
                        required
                        placeholder="Cost"
                        value={item.unitCost}
                        onChange={(e) => {
                          const updated = [...poForm.items];
                          updated[idx].unitCost = e.target.value;
                          setPoForm({ ...poForm, items: updated });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
