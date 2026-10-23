import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Building,
  Briefcase,
  X,
  DollarSign,
  CreditCard,
  History,
  Search,
  Filter,
  Edit2,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [payModalEmp, setPayModalEmp] = useState(null);
  const [borrowModalEmp, setBorrowModalEmp] = useState(null);
  const [historyModalEmp, setHistoryModalEmp] = useState(null);
  const [editModalEmp, setEditModalEmp] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '',
    jobTitle: 'Sales Associate & Fragrance Advisor',
    department: 'Retail Sales',
    phone: '',
    email: '',
    salary: 25000,
    bankAccount: '',
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    baseSalary: 0,
    advanceDeduction: 0,
    bonus: 0,
    paymentMethod: 'bank',
    reference: '',
    notes: '',
    recordAsExpense: true,
  });

  const [borrowForm, setBorrowForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reason: '',
    paymentMethod: 'cash',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.get('/employees?limit=100')
      .then((eRes) => {
        setEmployees(eRes.data.data.items || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load employee records');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q) ||
        emp.phone?.includes(q) ||
        emp.department?.toLowerCase().includes(q);
      const matchDept = !selectedDept || emp.department === selectedDept;
      return matchSearch && matchDept;
    });
  }, [employees, search, selectedDept]);

  const totalMonthlyPayroll = employees.reduce((acc, emp) => acc + (Number(emp.salary) || 0), 0);
  const totalActiveAdvance = employees.reduce((acc, emp) => acc + (Number(emp.advanceBalance) || 0), 0);

  // 1. Create Employee
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/employees', addForm);
      toast.success(`Employee profile created for ${addForm.name}`);
      setShowAddModal(false);
      setAddForm({
        name: '',
        jobTitle: 'Sales Associate & Fragrance Advisor',
        department: 'Retail Sales',
        phone: '',
        email: '',
        branch: '',
        salary: 25000,
        bankAccount: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create employee profile');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Open Pay Modal
  const openPayModal = (emp) => {
    setPayModalEmp(emp);
    const base = Number(emp.salary) || 0;
    const maxAdv = Number(emp.advanceBalance) || 0;
    setPayForm({
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      baseSalary: base,
      advanceDeduction: maxAdv > 0 ? Math.min(5000, maxAdv) : 0,
      bonus: 0,
      paymentMethod: 'bank',
      reference: `SAL-${emp.employeeCode || 'EMP'}-${new Date().getMonth() + 1}`,
      notes: 'Monthly showroom compensation',
      recordAsExpense: true,
    });
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payModalEmp) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/employees/${payModalEmp._id}/payout`, payForm);
      toast.success(res.data.message || `Salary paid to ${payModalEmp.name}`);
      setPayModalEmp(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to process salary payout');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Open Borrow Modal
  const openBorrowModal = (emp) => {
    setBorrowModalEmp(emp);
    setBorrowForm({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      reason: 'Personal Emergency Advance',
      paymentMethod: 'cash',
      notes: '',
    });
  };

  const handleRecordBorrow = async (e) => {
    e.preventDefault();
    if (!borrowModalEmp) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/employees/${borrowModalEmp._id}/borrow`, borrowForm);
      toast.success(res.data.message || `Advance recorded for ${borrowModalEmp.name}`);
      setBorrowModalEmp(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record advance');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Open Edit Modal
  const openEditModal = (emp) => {
    setEditModalEmp(emp);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editModalEmp) return;
    setSubmitting(true);
    try {
      await api.put(`/employees/${editModalEmp._id}`, editModalEmp);
      toast.success(`Updated profile for ${editModalEmp.name}`);
      setEditModalEmp(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee record for "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/employees/${id}`);
      toast.success(`Employee "${name}" deleted`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete employee');
    }
  };

  const netPayable = Math.max(
    0,
    Number(payForm.baseSalary || 0) - Number(payForm.advanceDeduction || 0) + Number(payForm.bonus || 0)
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Staff Salary & Payroll Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage showroom staff, record monthly salary payouts, and track advance borrow history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Summary KPI Strip (Clean, Simple, Professional) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Employees</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{employees.length} Staff Members</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Salary Commitment</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">₹{totalMonthlyPayroll.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Advance Borrowed</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">₹{totalActiveAdvance.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <label htmlFor="staff-search-input" className="sr-only">Search staff</label>
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="staff-search-input"
            name="search"
            type="text"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, code, phone..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <label htmlFor="staff-dept-select" className="sr-only">Filter by department</label>
          <select
            id="staff-dept-select"
            name="department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="">All Departments</option>
            <option value="Retail Sales">Retail Sales</option>
            <option value="Atelier & Blending">Atelier & Blending</option>
            <option value="Warehouse & Inventory">Warehouse & Inventory</option>
            <option value="Management">Management</option>
          </select>
        </div>
      </div>

      {/* SIMPLE DATA TABLE FOR STAFF SALARY & PAYROLL */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table aria-label="Staff Salary and Payroll Management Table" className="w-full text-left text-xs text-slate-700">
            <caption className="sr-only">Staff Directory and Payroll Table</caption>
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4">Code</th>
                <th scope="col" className="py-3 px-4">Staff Name & Contact</th>
                <th scope="col" className="py-3 px-4">Role / Department</th>
                <th scope="col" className="py-3 px-4 text-right">Base Salary</th>
                <th scope="col" className="py-3 px-4 text-right">Advance Borrowed</th>
                <th scope="col" className="py-3 px-4 text-center">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No staff records found. Click "+ Add New Staff" above.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {emp.employeeCode}
                    </td>

                    {/* Staff Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{emp.phone || emp.email || '—'}</div>
                    </td>

                    {/* Designation & Dept */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{emp.jobTitle}</div>
                      <div className="text-[10px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Base Salary */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{(Number(emp.salary) || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Advance Balance */}
                    <td className="py-3.5 px-4 text-right">
                      {emp.advanceBalance > 0 ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          ₹{Number(emp.advanceBalance).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {emp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Pay Salary button */}
                      <button
                        type="button"
                        aria-label={`Process monthly salary for ${emp.name}`}
                        onClick={() => openPayModal(emp)}
                        title="Process Monthly Salary"
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs inline-flex items-center space-x-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Pay</span>
                      </button>

                      {/* Borrow / Advance button */}
                      <button
                        type="button"
                        aria-label={`Record advance loan for ${emp.name}`}
                        onClick={() => openBorrowModal(emp)}
                        title="Record Advance Loan"
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer shadow-xs inline-flex items-center space-x-1"
                      >
                        <ArrowDownLeft className="w-3 h-3 text-indigo-600" />
                        <span>Advance</span>
                      </button>

                      {/* Audit History button */}
                      <button
                        type="button"
                        aria-label={`View borrow and payroll history for ${emp.name}`}
                        onClick={() => setHistoryModalEmp(emp)}
                        title="View Borrow & Payroll History"
                        className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Profile button */}
                      <button
                        type="button"
                        aria-label={`Edit staff profile for ${emp.name}`}
                        onClick={() => openEditModal(emp)}
                        title="Edit Staff Info"
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Staff button */}
                      <button
                        type="button"
                        aria-label={`Delete staff member ${emp.name}`}
                        onClick={() => handleDeleteEmployee(emp._id, emp.name)}
                        title="Delete Staff Member"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Staff Member</h3>
              <button type="button" aria-label="Close add staff modal" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label htmlFor="add-emp-name" className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  id="add-emp-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Farhan Siddiqui"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-emp-job" className="block font-semibold text-slate-700 mb-1">Job Title *</label>
                  <input
                    id="add-emp-job"
                    name="jobTitle"
                    type="text"
                    required
                    autoComplete="organization-title"
                    value={addForm.jobTitle}
                    onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="add-emp-dept" className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    id="add-emp-dept"
                    name="department"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Retail Sales">Retail Sales</option>
                    <option value="Atelier & Blending">Atelier & Blending</option>
                    <option value="Warehouse & Inventory">Warehouse & Inventory</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-emp-phone" className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    id="add-emp-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="add-emp-salary" className="block font-semibold text-slate-700 mb-1">Monthly Base Salary (₹) *</label>
                  <input
                    id="add-emp-salary"
                    name="salary"
                    type="number"
                    required
                    min="0"
                    autoComplete="off"
                    value={addForm.salary}
                    onChange={(e) => setAddForm({ ...addForm, salary: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-emp-bank" className="block font-semibold text-slate-700 mb-1">Bank Account / IFSC</label>
                <input
                  id="add-emp-bank"
                  name="bankAccount"
                  type="text"
                  autoComplete="off"
                  value={addForm.bankAccount}
                  onChange={(e) => setAddForm({ ...addForm, bankAccount: e.target.value })}
                  placeholder="HDFC0001234 - 50100..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PAY SALARY MODAL */}
      {payModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Salary Payout Voucher</h3>
                  <p className="text-xs text-slate-500">{payModalEmp.name} ({payModalEmp.employeeCode})</p>
                </div>
              </div>
              <button type="button" aria-label="Close salary payout modal" onClick={() => setPayModalEmp(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySalary} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-salary-month" className="block font-semibold text-slate-700 mb-1">Salary Month *</label>
                  <input
                    id="pay-salary-month"
                    name="month"
                    type="text"
                    required
                    autoComplete="off"
                    value={payForm.month}
                    onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="pay-salary-method" className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    id="pay-salary-method"
                    name="paymentMethod"
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="bank">Bank Transfer (NEFT)</option>
                    <option value="cash">Cash Counter Drawer</option>
                    <option value="upi">UPI / Online</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="pay-salary-base" className="block font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                  <input
                    id="pay-salary-base"
                    name="baseSalary"
                    type="number"
                    required
                    min="0"
                    autoComplete="off"
                    value={payForm.baseSalary}
                    onChange={(e) => setPayForm({ ...payForm, baseSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="pay-salary-advance" className="block font-semibold text-slate-700 mb-1">
                    Advance Deduct (₹)
                    {payModalEmp.advanceBalance > 0 && (
                      <span className="text-indigo-600 text-[10px] block font-normal">Max: ₹{payModalEmp.advanceBalance}</span>
                    )}
                  </label>
                  <input
                    id="pay-salary-advance"
                    name="advanceDeduction"
                    type="number"
                    min="0"
                    max={payModalEmp.advanceBalance || 0}
                    autoComplete="off"
                    value={payForm.advanceDeduction}
                    onChange={(e) => setPayForm({ ...payForm, advanceDeduction: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label htmlFor="pay-salary-bonus" className="block font-semibold text-slate-700 mb-1">Incentive / Bonus (₹)</label>
                  <input
                    id="pay-salary-bonus"
                    name="bonus"
                    type="number"
                    min="0"
                    autoComplete="off"
                    value={payForm.bonus}
                    onChange={(e) => setPayForm({ ...payForm, bonus: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Net Payout Calculation */}
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">Net Payout Amount</span>
                  <span className="text-[10px] text-emerald-600">Base Salary - Advance Deduction + Bonus</span>
                </div>
                <span className="text-2xl font-bold text-emerald-700">
                  ₹{netPayable.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-salary-ref" className="block font-semibold text-slate-700 mb-1">Reference / UTR / Voucher</label>
                  <input
                    id="pay-salary-ref"
                    name="reference"
                    type="text"
                    autoComplete="off"
                    value={payForm.reference}
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                    placeholder="e.g. UTR-98765432"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="pay-salary-notes" className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    id="pay-salary-notes"
                    name="notes"
                    type="text"
                    autoComplete="off"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="e.g. Monthly salary"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="recordExpense"
                  name="recordAsExpense"
                  checked={payForm.recordAsExpense}
                  onChange={(e) => setPayForm({ ...payForm, recordAsExpense: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="recordExpense" className="text-xs text-slate-700">
                  Record in Operating Expenses under <strong>Salaries & Payroll</strong>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayModalEmp(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? 'Processing...' : `Disburse ₹${netPayable.toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BORROW / ADVANCE MODAL */}
      {borrowModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Salary Advance</h3>
                  <p className="text-xs text-slate-500">{borrowModalEmp.name} (Current: ₹{borrowModalEmp.advanceBalance || 0})</p>
                </div>
              </div>
              <button type="button" aria-label="Close salary advance modal" onClick={() => setBorrowModalEmp(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordBorrow} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="borrow-emp-amount" className="block font-semibold text-slate-700 mb-1">Advance Amount (₹) *</label>
                <input
                  id="borrow-emp-amount"
                  name="amount"
                  type="number"
                  required
                  min="100"
                  autoComplete="off"
                  value={borrowForm.amount}
                  onChange={(e) => setBorrowForm({ ...borrowForm, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="borrow-emp-date" className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    id="borrow-emp-date"
                    name="date"
                    type="date"
                    autoComplete="off"
                    required
                    value={borrowForm.date}
                    onChange={(e) => setBorrowForm({ ...borrowForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="borrow-emp-method" className="block font-semibold text-slate-700 mb-1">Disbursed Via</label>
                  <select
                    id="borrow-emp-method"
                    name="paymentMethod"
                    value={borrowForm.paymentMethod}
                    onChange={(e) => setBorrowForm({ ...borrowForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="borrow-emp-reason" className="block font-semibold text-slate-700 mb-1">Reason for Advance</label>
                <input
                  id="borrow-emp-reason"
                  name="reason"
                  type="text"
                  required
                  autoComplete="off"
                  value={borrowForm.reason}
                  onChange={(e) => setBorrowForm({ ...borrowForm, reason: e.target.value })}
                  placeholder="e.g. Personal emergency advance"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="borrow-emp-notes" className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  id="borrow-emp-notes"
                  name="notes"
                  rows="2"
                  value={borrowForm.notes}
                  onChange={(e) => setBorrowForm({ ...borrowForm, notes: e.target.value })}
                  placeholder="Deductible in monthly salary..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBorrowModalEmp(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Authorize Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BORROW & PAYROLL AUDIT HISTORY MODAL */}
      {historyModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Borrow & Payroll Audit History</h3>
                <p className="text-xs text-slate-500">
                  {historyModalEmp.name} &bull; Code: {historyModalEmp.employeeCode} &bull; Outstanding Advance: <strong className="text-slate-900">₹{historyModalEmp.advanceBalance || 0}</strong>
                </p>
              </div>
              <button type="button" aria-label="Close audit history modal" onClick={() => setHistoryModalEmp(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Advance Borrow Ledger */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center space-x-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>Advance Borrow Ledger</span>
              </h4>

              {(!historyModalEmp.borrowHistory || historyModalEmp.borrowHistory.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                  No advance borrow records logged for this employee.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {historyModalEmp.borrowHistory.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">₹{item.amount?.toLocaleString('en-IN')}</span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            item.status === 'settled' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{item.reason}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{new Date(item.date).toLocaleDateString()} &bull; Disbursed via {item.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Settled:</span>
                        <strong className="text-xs text-slate-800">₹{item.settledAmount || 0}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disbursed Payroll History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Disbursed Payroll History</span>
              </h4>

              {(!historyModalEmp.payrollHistory || historyModalEmp.payrollHistory.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                  No past salary disbursements recorded.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {historyModalEmp.payrollHistory.map((p, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{p.month}</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Base: ₹{p.baseSalary?.toLocaleString('en-IN')} | Deductions: ₹{p.advanceDeduction || 0} | Bonus: ₹{p.bonus || 0}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Paid on {new Date(p.paymentDate).toLocaleDateString()} via {p.paymentMethod?.toUpperCase()} {p.reference ? `(${p.reference})` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">Net Disbursed:</span>
                        <strong className="text-base font-bold text-emerald-700">₹{p.netPaid?.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setHistoryModalEmp(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                Close Audit History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EDIT STAFF MODAL */}
      {editModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Edit Staff Profile</h3>
              <button type="button" aria-label="Close edit staff modal" onClick={() => setEditModalEmp(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-3 text-xs">
              <div>
                <label htmlFor="edit-emp-name" className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  id="edit-emp-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={editModalEmp.name}
                  onChange={(e) => setEditModalEmp({ ...editModalEmp, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-emp-job" className="block font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    id="edit-emp-job"
                    name="jobTitle"
                    type="text"
                    autoComplete="organization-title"
                    value={editModalEmp.jobTitle}
                    onChange={(e) => setEditModalEmp({ ...editModalEmp, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-dept" className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    id="edit-emp-dept"
                    name="department"
                    type="text"
                    autoComplete="off"
                    value={editModalEmp.department}
                    onChange={(e) => setEditModalEmp({ ...editModalEmp, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-emp-phone" className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    id="edit-emp-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={editModalEmp.phone}
                    onChange={(e) => setEditModalEmp({ ...editModalEmp, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-salary" className="block font-semibold text-slate-700 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    id="edit-emp-salary"
                    name="salary"
                    type="number"
                    autoComplete="off"
                    value={editModalEmp.salary}
                    onChange={(e) => setEditModalEmp({ ...editModalEmp, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalEmp(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
