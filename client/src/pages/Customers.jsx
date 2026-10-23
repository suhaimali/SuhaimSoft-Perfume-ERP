import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Award,
  CreditCard,
  Search,
  X,
  Edit2,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'retail',
    discountPercent: 0,
    creditLimit: 0,
    notes: '',
  });

  // Edit Modal
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'retail',
    discountPercent: 0,
    creditLimit: 0,
    notes: '',
  });

  // Ledger / Transaction History Modal
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState({ sales: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadCustomers = () => {
    setLoading(true);
    api.get(`/customers?limit=100&search=${encodeURIComponent(search)}`)
      .then((res) => setCustomers(res.data.data.items || []))
      .catch(() => toast.error('Failed to load customer profiles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', formData);
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '', type: 'retail', discountPercent: 0, creditLimit: 0, notes: '' });
      toast.success('Perfume client created successfully');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create perfume client');
    }
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setEditFormData({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      type: c.type === 'wholesale' ? 'vip' : (c.type || 'retail'),
      discountPercent: c.discountPercent || 0,
      creditLimit: c.creditLimit || 0,
      notes: c.notes || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await api.put(`/customers/${editingCustomer._id}`, editFormData);
      setEditingCustomer(null);
      toast.success('Perfume client details updated');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update perfume client');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete perfume client "${name}"?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success(`Perfume client ${name} deleted`);
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete customer');
    }
  };

  const openLedger = async (c) => {
    setLedgerCustomer(c);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/customers/${c._id}/ledger`);
      setLedgerData(res.data.data || { sales: [], payments: [] });
    } catch {
      toast.error('Failed to load customer ledger');
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
            <span>Perfume Customer Profiles & Loyalty</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Perfume client accounts, VIP fragrance club members, loyalty rewards points, and boutique store credit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Perfume Client</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <label htmlFor="customer-search-input" className="sr-only">
          Search by perfume client name, phone, or code
        </label>
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          id="customer-search-input"
          name="search"
          type="text"
          autoComplete="off"
          aria-label="Search by perfume client name, phone, or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by perfume client name, phone, or code..."
          className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear customer search"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* CUSTOMER DATA TABLE WITH ACTION BUTTONS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table aria-label="Customer Profiles and Loyalty Table" className="w-full text-left text-xs text-slate-700">
            <caption className="sr-only">Customer Profiles and Loyalty Register</caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4">Code</th>
                <th scope="col" className="py-3 px-4">Perfume Client Name</th>
                <th scope="col" className="py-3 px-4">Contact (Phone / Email)</th>
                <th scope="col" className="py-3 px-4 text-center">Tier</th>
                <th scope="col" className="py-3 px-4 text-right">Fragrance Points</th>
                <th scope="col" className="py-3 px-4 text-right">Balance Due</th>
                <th scope="col" className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No customer profiles found. Click "+ Add Perfume Client" above.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {c.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-mono font-medium">{c.phone || '—'}</div>
                      {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.type === 'vip' || c.type === 'wholesale'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {c.type === 'vip' || c.type === 'wholesale' ? 'VIP Perfume' : 'Boutique Retail'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                      <span className="inline-flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>{c.loyaltyPoints || 0} pts</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={c.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        ₹{(c.outstandingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          aria-label={`View ledger for ${c.name}`}
                          onClick={() => openLedger(c)}
                          title="View Ledger & Purchase History"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit customer ${c.name}`}
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete customer ${c.name}`}
                          onClick={() => handleDelete(c._id, c.name)}
                          title="Delete Customer"
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

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Perfume Client Profile</h3>
              <button
                type="button"
                aria-label="Close add customer modal"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="create-cust-name" className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  id="create-cust-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tariq Al Mansoor"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-cust-phone" className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    id="create-cust-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="create-cust-email" className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="create-cust-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. tariq@domain.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-cust-type" className="block font-medium text-slate-700 mb-1">Client Tier</label>
                  <select
                    id="create-cust-type"
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="retail">Boutique Retail (Walk-in)</option>
                    <option value="vip">VIP Fragrance Member</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="create-cust-discount" className="block font-medium text-slate-700 mb-1">Default Discount (%)</label>
                  <input
                    id="create-cust-discount"
                    name="discountPercent"
                    type="number"
                    autoComplete="off"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-cust-credit" className="block font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
                <input
                  id="create-cust-credit"
                  name="creditLimit"
                  type="number"
                  autoComplete="off"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
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
                  Create Perfume Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Perfume Client Profile</h3>
                <p className="text-[11px] text-slate-500 font-mono">Code: {editingCustomer.code}</p>
              </div>
              <button
                type="button"
                aria-label="Close edit customer modal"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-cust-name" className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  id="edit-cust-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-cust-phone" className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    id="edit-cust-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-cust-email" className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="edit-cust-email"
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
                  <label htmlFor="edit-cust-type" className="block font-medium text-slate-700 mb-1">Client Tier</label>
                  <select
                    id="edit-cust-type"
                    name="type"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="retail">Boutique Retail</option>
                    <option value="vip">VIP Fragrance Member</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-cust-discount" className="block font-medium text-slate-700 mb-1">Discount (%)</label>
                  <input
                    id="edit-cust-discount"
                    name="discountPercent"
                    type="number"
                    autoComplete="off"
                    min="0"
                    max="100"
                    value={editFormData.discountPercent}
                    onChange={(e) => setEditFormData({ ...editFormData, discountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-cust-credit" className="block font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
                <input
                  id="edit-cust-credit"
                  name="creditLimit"
                  type="number"
                  autoComplete="off"
                  min="0"
                  value={editFormData.creditLimit}
                  onChange={(e) => setEditFormData({ ...editFormData, creditLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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

      {/* Customer Ledger & History Modal */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Perfume Client Ledger: {ledgerCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {ledgerCustomer.code} &bull; {ledgerCustomer.phone}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close customer ledger modal"
                onClick={() => setLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Loyalty Balance</span>
                <p className="text-base font-bold text-blue-600 mt-0.5">{ledgerCustomer.loyaltyPoints || 0} pts</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Outstanding Balance</span>
                <p className={`text-base font-bold mt-0.5 ${ledgerCustomer.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{(ledgerCustomer.outstandingBalance || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Credit Limit</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">₹{(ledgerCustomer.creditLimit || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Invoices & History Table */}
            <div className="flex-1 overflow-y-auto min-h-[220px]">
              {ledgerLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading customer history...</div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Sales & Invoices</h4>
                  {ledgerData.sales?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No purchase history found for this customer.</p>
                  ) : (
                    <table aria-label="Customer Purchase and Invoices Ledger Table" className="w-full text-left text-xs text-slate-700 border-collapse">
                      <caption className="sr-only">Customer Purchase and Invoices Ledger</caption>
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th scope="col" className="py-2 px-3">Invoice</th>
                          <th scope="col" className="py-2 px-3">Date</th>
                          <th scope="col" className="py-2 px-3 text-right">Grand Total</th>
                          <th scope="col" className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerData.sales?.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{s.invoiceNo}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {s.saleDate ? new Date(s.saleDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{(s.grandTotal || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {s.paymentStatus || 'Paid'}
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
                onClick={() => setLedgerCustomer(null)}
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
