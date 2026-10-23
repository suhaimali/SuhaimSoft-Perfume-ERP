import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Lock,
  Mail,
  Phone,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add User Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    maxDiscountPercent: 10,
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: '',
    maxDiscountPercent: 10,
    status: 'active',
    password: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/roles')])
      .then(([uRes, rRes]) => {
        setUsers(uRes.data.data.items || []);
        setRoles(rRes.data.data.roles || []);
      })
      .catch(() => toast.error('Failed to load user accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: '', maxDiscountPercent: 10 });
      toast.success('Staff account created');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      role: u.role?._id || u.role || '',
      maxDiscountPercent: u.maxDiscountPercent != null ? u.maxDiscountPercent : 10,
      status: u.status || 'active',
      password: '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role || undefined,
        maxDiscountPercent: Number(editForm.maxDiscountPercent),
        status: editForm.status,
      };
      if (editForm.password && editForm.password.trim().length >= 8) {
        payload.password = editForm.password.trim();
      }

      await api.put(`/users/${editingUser._id}`, payload);
      setEditingUser(null);
      toast.success('Staff account updated');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id, name, isMasterAdmin) => {
    if (isMasterAdmin) {
      toast.error('Master Admin account cannot be deleted');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete staff account "${name}"?`)) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success(`Account for "${name}" deleted`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Staff Users & Access Control (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Master Admin, store managers, POS cashiers, inventory clerks, and module permission grants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Users table with Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table aria-label="Staff User Accounts Table" className="w-full text-left text-xs text-slate-700">
            <caption className="sr-only">Staff User Accounts and RBAC Permissions Table</caption>
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3.5">Staff User</th>
                <th scope="col" className="px-4 py-3.5">Assigned Role</th>
                <th scope="col" className="px-4 py-3.5 text-center">Discount Limit</th>
                <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                <th scope="col" className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400">Loading user accounts...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400">No staff user accounts found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.email}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.isMasterAdmin ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Master Admin (All Modules)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {u.role?.name || 'Standard Staff'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center font-bold text-blue-600">
                      {u.isMasterAdmin ? '100% (Full)' : `${u.maxDiscountPercent || u.role?.maxDiscountPercent || 10}%`}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          aria-label={`Edit staff account for ${u.name}`}
                          onClick={() => openEditModal(u)}
                          title="Edit Staff Account & Permissions"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={u.isMasterAdmin}
                          aria-label={`Delete staff account for ${u.name}`}
                          onClick={() => handleDelete(u._id, u.name, u.isMasterAdmin)}
                          title={u.isMasterAdmin ? 'Cannot delete Master Admin' : 'Delete Account'}
                          className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                            u.isMasterAdmin
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
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

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Staff Account</h3>
              <button type="button" aria-label="Close create user modal" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="create-user-name" className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  id="create-user-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="create-user-email" className="block font-medium text-slate-700 mb-1">Work Email Address *</label>
                <input
                  id="create-user-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. rahul@perfume.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="create-user-password" className="block font-medium text-slate-700 mb-1">Account Password *</label>
                <input
                  id="create-user-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="create-user-role" className="block font-medium text-slate-700 mb-1">Security Role</label>
                <select
                  id="create-user-role"
                  name="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Standard Staff</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="create-user-discount" className="block font-medium text-slate-700 mb-1">Max Cashier Discount (%)</label>
                <input
                  id="create-user-discount"
                  name="maxDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  autoComplete="off"
                  value={form.maxDiscountPercent}
                  onChange={(e) => setForm({ ...form, maxDiscountPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Staff Account</h3>
                <p className="text-[11px] text-slate-500 font-mono">{editingUser.email}</p>
              </div>
              <button type="button" aria-label="Close edit user modal" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-user-name" className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  id="edit-user-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="edit-user-phone" className="block font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  id="edit-user-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="edit-user-role" className="block font-medium text-slate-700 mb-1">Security Role</label>
                <select
                  id="edit-user-role"
                  name="role"
                  disabled={editingUser.isMasterAdmin}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Standard Staff</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-user-discount" className="block font-medium text-slate-700 mb-1">Max Discount (%)</label>
                  <input
                    id="edit-user-discount"
                    name="maxDiscountPercent"
                    type="number"
                    min="0"
                    max="100"
                    autoComplete="off"
                    value={editForm.maxDiscountPercent}
                    onChange={(e) => setEditForm({ ...editForm, maxDiscountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-status" className="block font-medium text-slate-700 mb-1">Account Status</label>
                  <select
                    id="edit-user-status"
                    name="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-user-password" className="block font-medium text-slate-700 mb-1">Reset Password (leave empty to keep current)</label>
                <input
                  id="edit-user-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="New password (min 8 characters)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
