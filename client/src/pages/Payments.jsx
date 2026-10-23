import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { generatePaymentVoucherPdf } from '../utils/pdfGenerator';
import PaymentVoucherModal from '../components/PaymentVoucherModal';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [cashPreview, setCashPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomerPayModal, setShowCustomerPayModal] = useState(false);
  const [showSupplierPayModal, setShowSupplierPayModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [payForm, setPayForm] = useState({ entityId: '', amount: '', method: 'cash', reference: '', notes: '' });
  const [countedCash, setCountedCash] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'in' | 'out'

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/payments?limit=150'),
      api.get('/payments/cash-preview'),
      api.get('/customers?limit=100'),
      api.get('/suppliers?limit=100'),
    ])
      .then(([pRes, cRes, custRes, supRes]) => {
        setPayments(pRes.data.data.items || []);
        setCashPreview(cRes.data.data);
        setCustomers(custRes.data.data.items || []);
        setSuppliers(supRes.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load financial records'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/customer', {
        customerId: payForm.entityId,
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference,
        notes: payForm.notes,
      });
      setShowCustomerPayModal(false);
      setPayForm({ entityId: '', amount: '', method: 'cash', reference: '', notes: '' });
      toast.success('Customer payment received and recorded');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Payment recording failed');
    }
  };

  const handleSupplierPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/supplier', {
        supplierId: payForm.entityId,
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference,
        notes: payForm.notes,
      });
      setShowSupplierPayModal(false);
      setPayForm({ entityId: '', amount: '', method: 'cash', reference: '', notes: '' });
      toast.success('Supplier payout recorded');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Payment recording failed');
    }
  };

  const handleClosingSubmit = async (e) => {
    e.preventDefault();
    if (!cashPreview?.branchId) return;

    try {
      await api.post('/payments/cash-closings', {
        branchId: cashPreview.branchId,
        countedCash: Number(countedCash),
        date: new Date(),
      });
      setShowClosingModal(false);
      setCountedCash('');
      toast.success('Daily cash register closing successfully reconciled');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit closing');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (directionFilter === 'all') return true;
    return p.direction === directionFilter;
  });

  const handlePrintVoucher = () => {
    window.print();
  };

  const handleDeletePayment = async (id, number) => {
    if (!window.confirm(`Are you sure you want to delete payment record "${number}"?`)) {
      return;
    }
    try {
      await api.delete(`/payments/${id}`);
      toast.success(`Payment record ${number} deleted`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete payment record');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header — Clean & Simple */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Payments & Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage incoming receipts, supplier payouts, and cash drawer reconciliations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomerPayModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receive (AR)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSupplierPayModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pay Supplier</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClosingModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Closing</span>
          </button>
        </div>
      </div>

      {/* Daily Cash Status Summary */}
      {cashPreview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Cash In Today</p>
            <p className="text-lg font-bold text-emerald-600">₹{cashPreview.cashIn?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Cash Out</p>
            <p className="text-lg font-bold text-slate-800">₹{cashPreview.cashOut?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Cash Expenses</p>
            <p className="text-lg font-bold text-slate-800">₹{cashPreview.expensesCash?.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-slate-100 sm:pl-4">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Drawer Cash</p>
              <p className="text-lg font-extrabold text-slate-900">₹{cashPreview.expectedCash?.toLocaleString('en-IN')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowClosingModal(true)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Reconcile
            </button>
          </div>
        </div>
      )}

      {/* Clean Filter Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs">
        {[
          { key: 'all', label: 'All Transactions', count: payments.length },
          { key: 'in', label: 'Inflow (+)', count: payments.filter((p) => p.direction === 'in').length },
          { key: 'out', label: 'Outflow (-)', count: payments.filter((p) => p.direction === 'out').length },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setDirectionFilter(f.key)}
            className={`px-3 py-2 font-medium transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
              directionFilter === f.key
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{f.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              directionFilter === f.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table aria-label="Payments and Transactions Ledger Table" className="w-full text-left text-xs">
            <caption className="sr-only">Financial Payments and Receipts Ledger</caption>
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Payment # & Date</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Party</th>
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3 text-right">Amount</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">No payment transactions found.</td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedVoucher(p)}
                        className="font-medium text-blue-600 hover:underline font-mono text-left cursor-pointer"
                        title="View Payment Voucher"
                      >
                        {p.number}
                      </button>
                      <p className="text-[10px] text-slate-400">{new Date(p.date).toLocaleDateString('en-IN')}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        p.direction === 'in'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {p.kind?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {p.customer?.name || p.supplier?.name || 'Walk-in Guest'}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <span className="uppercase text-slate-800 font-medium">{p.method}</span>
                      {p.reference && <span className="text-[10px] text-slate-400 block font-mono">{p.reference}</span>}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${p.direction === 'in' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {p.direction === 'in' ? '+' : '-'}₹{p.amount?.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="text-emerald-700 text-[10px] font-medium uppercase bg-emerald-50 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          aria-label={`View payment voucher for ${p.number}`}
                          onClick={() => setSelectedVoucher(p)}
                          title="View Voucher"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Download PDF voucher for ${p.number}`}
                          onClick={() => {
                            generatePaymentVoucherPdf(p);
                            toast.success(`Voucher ${p.number} downloaded`);
                          }}
                          title="Download PDF"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete payment record ${p.number}`}
                          onClick={() => handleDeletePayment(p._id, p.number)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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

      {/* All-in-One Chrome PDF Payment Voucher Modal */}
      {selectedVoucher && (
        <PaymentVoucherModal payment={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      )}

      {/* Customer Payment Modal */}
      {showCustomerPayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Receive Customer Payment</span>
              </h3>
              <button type="button" aria-label="Close customer payment modal" onClick={() => setShowCustomerPayModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomerPayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="customer-pay-entity" className="block font-medium text-slate-700 mb-1">Customer *</label>
                <select
                  id="customer-pay-entity"
                  name="customerId"
                  required
                  value={payForm.entityId}
                  onChange={(e) => setPayForm({ ...payForm, entityId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} - Outstanding Due: ₹{c.outstandingBalance || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-pay-amount" className="block font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    id="customer-pay-amount"
                    name="amount"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="customer-pay-method" className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    id="customer-pay-method"
                    name="method"
                    value={payForm.method}
                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="customer-pay-ref" className="block font-medium text-slate-700 mb-1">Reference No / Note</label>
                <input
                  id="customer-pay-ref"
                  name="reference"
                  type="text"
                  autoComplete="off"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="e.g. UPI-TXN-998822"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCustomerPayModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {showSupplierPayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-slate-800" />
                <span>Pay Supplier Dues (AP)</span>
              </h3>
              <button type="button" aria-label="Close supplier payment modal" onClick={() => setShowSupplierPayModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierPayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="supplier-pay-entity" className="block font-medium text-slate-700 mb-1">Supplier *</label>
                <select
                  id="supplier-pay-entity"
                  name="supplierId"
                  required
                  value={payForm.entityId}
                  onChange={(e) => setPayForm({ ...payForm, entityId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} - Outstanding Due: ₹{s.outstandingBalance || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="supplier-pay-amount" className="block font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    id="supplier-pay-amount"
                    name="amount"
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="supplier-pay-method" className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    id="supplier-pay-method"
                    name="method"
                    value={payForm.method}
                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="bank">Bank NEFT/RTGS</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="supplier-pay-ref" className="block font-medium text-slate-700 mb-1">Transaction Ref / Cheque No</label>
                <input
                  id="supplier-pay-ref"
                  name="reference"
                  type="text"
                  autoComplete="off"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="e.g. UTR-HDFC-001928"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSupplierPayModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Record Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Closing Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>End-of-Day Cash Reconciliation</span>
              </h3>
              <button type="button" aria-label="Close cash closing modal" onClick={() => setShowClosingModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClosingSubmit} className="space-y-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>System Expected Cash:</span>
                  <span className="font-bold text-slate-900">₹{cashPreview?.expectedCash?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label htmlFor="closing-cash-count" className="block font-medium text-slate-700 mb-1">Physical Cash Count in Drawer (₹) *</label>
                <input
                  id="closing-cash-count"
                  name="countedCash"
                  type="number"
                  required
                  min="0"
                  autoComplete="off"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Count physical notes and coins"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              {countedCash && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  Number(countedCash) === cashPreview?.expectedCash
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  Difference (Overage/Shortage): ₹{(Number(countedCash) - (cashPreview?.expectedCash || 0)).toFixed(2)}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClosingModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Close Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
