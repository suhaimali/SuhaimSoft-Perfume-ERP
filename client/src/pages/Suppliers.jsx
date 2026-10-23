import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  Building,
  DollarSign,
  Search,
  X,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    paymentTermsDays: 30,
    openingBalance: 0,
    notes: '',
  });

  // Edit Modal State
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    paymentTermsDays: 30,
    notes: '',
  });

  // Ledger Modal State
  const [ledgerSupplier, setLedgerSupplier] = useState(null);
  const [ledgerData, setLedgerData] = useState({ purchases: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadSuppliers = () => {
    setLoading(true);
    api.get(`/suppliers?limit=100&search=${encodeURIComponent(search)}`)
      .then((res) => setSuppliers(res.data.data.items || []))
      .catch(() => toast.error('Failed to load supplier accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', formData);
      setShowModal(false);
      setFormData({
        name: '',
        company: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        paymentTermsDays: 30,
        openingBalance: 0,
        notes: '',
      });
      toast.success('Supplier account created');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create supplier');
    }
  };

  const openEditModal = (s) => {
    setEditingSupplier(s);
    setEditFormData({
      name: s.name || '',
      company: s.company || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      gstin: s.gstin || '',
      paymentTermsDays: s.paymentTermsDays || 30,
      notes: s.notes || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      await api.put(`/suppliers/${editingSupplier._id}`, editFormData);
      setEditingSupplier(null);
      toast.success('Supplier details updated');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update supplier');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete supplier account "${name}"?`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success(`Supplier "${name}" deleted`);
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete supplier');
    }
  };

  const openLedger = async (s) => {
    setLedgerSupplier(s);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/suppliers/${s._id}/ledger`);
      setLedgerData(res.data.data || { purchases: [], payments: [] });
    } catch {
      toast.error('Failed to load supplier ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Supplier & Vendor Accounts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fragrance essence distillers, bottle manufacturers, packaging suppliers, and outstanding payables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <label htmlFor="supplier-search-input" className="sr-only">Search suppliers</label>
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          id="supplier-search-input"
          name="search"
          type="text"
          autoComplete="off"
          aria-label="Search by supplier name, company, or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by supplier name, company, or code..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
        />
      </div>

      {/* SUPPLIERS DATA TABLE WITH ACTION BUTTONS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table aria-label="Supplier and Vendor Accounts Table" className="w-full text-left text-xs text-slate-700">
            <caption className="sr-only">Supplier and Vendor Accounts Register</caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4">Code</th>
                <th scope="col" className="py-3 px-4">Supplier / Vendor</th>
                <th scope="col" className="py-3 px-4">Company Name</th>
                <th scope="col" className="py-3 px-4">Contact (Phone / Email)</th>
                <th scope="col" className="py-3 px-4 text-right">Total Purchased</th>
                <th scope="col" className="py-3 px-4 text-right">Outstanding Due</th>
                <th scope="col" className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading supplier accounts...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No supplier accounts found. Click "+ Add New Supplier" above.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {s.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      {s.contactPerson && <div className="text-[11px] text-slate-500">Contact: {s.contactPerson}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600">
                      {s.company || 'Distributor'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-mono font-medium">{s.phone || '—'}</div>
                      {s.email && <div className="text-[11px] text-slate-500">{s.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{(s.totalPurchased || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={s.outstandingBalance > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                        ₹{(s.outstandingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          aria-label={`View ledger for ${s.name}`}
                          onClick={() => openLedger(s)}
                          title="View Supplier Ledger & Orders"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit supplier ${s.name}`}
                          onClick={() => openEditModal(s)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete supplier ${s.name}`}
                          onClick={() => handleDelete(s._id, s.name)}
                          title="Delete Supplier"
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

      {/* Add Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Supplier Account</h3>
              <button type="button" aria-label="Close add supplier modal" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-supplier-name" className="block font-medium text-slate-700 mb-1">Vendor / Name *</label>
                  <input
                    id="add-supplier-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Grasse Oils Ltd"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="add-supplier-company" className="block font-medium text-slate-700 mb-1">Company / Brand</label>
                  <input
                    id="add-supplier-company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Distillerie France"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-supplier-contact" className="block font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  id="add-supplier-contact"
                  name="contactPerson"
                  type="text"
                  autoComplete="name"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Jean-Luc Godard"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-supplier-phone" className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    id="add-supplier-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 4 93 36 00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="add-supplier-email" className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="add-supplier-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="export@grasse.fr"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-supplier-gstin" className="block font-medium text-slate-700 mb-1">GSTIN / Tax ID</label>
                  <input
                    id="add-supplier-gstin"
                    name="gstin"
                    type="text"
                    autoComplete="off"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="27ABCDE1234F1Z5"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="add-supplier-terms" className="block font-medium text-slate-700 mb-1">Payment Terms (Days)</label>
                  <input
                    id="add-supplier-terms"
                    name="paymentTermsDays"
                    type="number"
                    autoComplete="off"
                    value={formData.paymentTermsDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermsDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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
                  Create Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Supplier Account</h3>
                <p className="text-[11px] text-slate-500 font-mono">Code: {editingSupplier.code}</p>
              </div>
              <button type="button" aria-label="Close edit supplier modal" onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-supplier-name" className="block font-medium text-slate-700 mb-1">Vendor / Name *</label>
                  <input
                    id="edit-supplier-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplier-company" className="block font-medium text-slate-700 mb-1">Company / Brand</label>
                  <input
                    id="edit-supplier-company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    value={editFormData.company}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-supplier-contact" className="block font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  id="edit-supplier-contact"
                  name="contactPerson"
                  type="text"
                  autoComplete="name"
                  value={editFormData.contactPerson}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-supplier-phone" className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    id="edit-supplier-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplier-email" className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="edit-supplier-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-supplier-gstin" className="block font-medium text-slate-700 mb-1">GSTIN / Tax ID</label>
                  <input
                    id="edit-supplier-gstin"
                    name="gstin"
                    type="text"
                    autoComplete="off"
                    value={editFormData.gstin}
                    onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplier-terms" className="block font-medium text-slate-700 mb-1">Payment Terms (Days)</label>
                  <input
                    id="edit-supplier-terms"
                    name="paymentTermsDays"
                    type="number"
                    autoComplete="off"
                    value={editFormData.paymentTermsDays}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentTermsDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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

      {/* Supplier Ledger & Purchase History Modal */}
      {ledgerSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supplier Ledger: {ledgerSupplier.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {ledgerSupplier.code} &bull; {ledgerSupplier.company || 'Distributor'} &bull; {ledgerSupplier.phone || 'No phone'}
                </p>
              </div>
              <button type="button" aria-label="Close supplier ledger modal" onClick={() => setLedgerSupplier(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Invoiced Purchases</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  ₹{(ledgerSupplier.totalPurchased || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Outstanding Payables Due</span>
                <p className={`text-base font-bold mt-0.5 ${ledgerSupplier.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{(ledgerSupplier.outstandingBalance || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Invoices & Purchase Orders Table */}
            <div className="flex-1 overflow-y-auto min-h-[220px]">
              {ledgerLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading supplier purchase orders...</div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Purchase Orders (PO)</h4>
                  {ledgerData.purchases?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No purchase history recorded for this vendor.</p>
                  ) : (
                    <table aria-label="Supplier Purchase Orders History Table" className="w-full text-left text-xs text-slate-700 border-collapse">
                      <caption className="sr-only">Purchase Orders History for Supplier</caption>
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th scope="col" className="py-2 px-3">PO Number</th>
                          <th scope="col" className="py-2 px-3">Date</th>
                          <th scope="col" className="py-2 px-3 text-right">Order Total</th>
                          <th scope="col" className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerData.purchases?.map((po) => (
                          <tr key={po._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{po.poNumber}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{(po.grandTotal || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {po.status || 'Received'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setLedgerSupplier(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
