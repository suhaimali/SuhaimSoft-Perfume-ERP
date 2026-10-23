import React, { useState, useEffect } from 'react';
import { Layers, Plus, Package, Globe, Tag, X, Check, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Catalog() {
  const [activeTab, setActiveTab] = useState('brands');
  const [brands, setBrands] = useState([]);
  const [families, setFamilies] = useState([]);
  const [concentrations, setConcentrations] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCountry, setNewCountry] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/brands?limit=100'),
      api.get('/categories?type=fragrance_family'),
      api.get('/categories?type=concentration'),
      api.get('/categories?type=bottle_size'),
    ])
      .then(([bRes, fRes, cRes, sRes]) => {
        setBrands(bRes.data.data.items || []);
        setFamilies(fRes.data.data.categories || []);
        setConcentrations(cRes.data.data.categories || []);
        setSizes(sRes.data.data.categories || []);
      })
      .catch(() => toast.error('Failed to load fragrance taxonomy'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'brands') {
        await api.post('/brands', { name: newName, description: newDesc, country: newCountry });
        toast.success(`Brand "${newName}" added`);
      } else {
        const typeMap = {
          families: 'fragrance_family',
          concentrations: 'concentration',
          sizes: 'bottle_size',
        };
        await api.post('/categories', { name: newName, description: newDesc, type: typeMap[activeTab] });
        toast.success(`Attribute "${newName}" added`);
      }
      setShowAddModal(false);
      setNewName('');
      setNewDesc('');
      setNewCountry('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save item');
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditDesc(item.description || '');
    setEditCountry(item.country || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (activeTab === 'brands') {
        await api.put(`/brands/${editingItem._id}`, {
          name: editName,
          description: editDesc,
          country: editCountry,
        });
        toast.success(`Brand updated`);
      } else {
        await api.put(`/categories/${editingItem._id}`, {
          name: editName,
          description: editDesc,
        });
        toast.success(`Attribute updated`);
      }
      setEditingItem(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id, name) => {
    const itemLabel = activeTab === 'brands' ? 'brand' : 'attribute';
    if (!window.confirm(`Are you sure you want to remove the ${itemLabel} "${name}"?`)) return;

    try {
      if (activeTab === 'brands') {
        await api.delete(`/brands/${id}`);
      } else {
        await api.delete(`/categories/${id}`);
      }
      toast.success(`${name} removed from catalog`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Brands & Fragrance Taxonomy</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure perfume houses, fragrance olfactory families, bottle sizes, and concentrations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New {activeTab === 'brands' ? 'Brand' : 'Attribute'}</span>
        </button>
      </div>

      {/* Responsive Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs">
        {[
          { key: 'brands', label: 'Perfume Houses & Brands', count: brands.length },
          { key: 'families', label: 'Fragrance Families (Olfactory)', count: families.length },
          { key: 'concentrations', label: 'Concentration Types', count: concentrations.length },
          { key: 'sizes', label: 'Standard Bottle Sizes', count: sizes.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content Data Tables */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading catalog taxonomy...
        </div>
      ) : activeTab === 'brands' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table aria-label="Perfume Brands and Houses Table" className="w-full text-left text-xs text-slate-700">
              <caption className="sr-only">Perfume Brands and Houses Register</caption>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Brand / House Name</th>
                  <th scope="col" className="py-3 px-4">Country of Origin</th>
                  <th scope="col" className="py-3 px-4">Description</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      No perfume houses found. Click "+ Add New Brand" above.
                    </td>
                  </tr>
                ) : (
                  brands.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {b.country || 'International'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {b.description || 'Luxury perfume house'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-emerald-700 font-semibold inline-flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            aria-label={`Edit brand ${b.name}`}
                            onClick={() => openEditModal(b)}
                            title="Edit Brand"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove brand ${b.name}`}
                            onClick={() => handleDelete(b._id, b.name)}
                            title="Remove Brand"
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
      ) : (
        (() => {
          const currentItems = activeTab === 'families' ? families : activeTab === 'concentrations' ? concentrations : sizes;
          const label = activeTab === 'families' ? 'Fragrance Families' : activeTab === 'concentrations' ? 'Concentration Types' : 'Standard Bottle Sizes';

          return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table aria-label={`${label} Table`} className="w-full text-left text-xs text-slate-700">
                  <caption className="sr-only">{label} Register</caption>
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th scope="col" className="py-3 px-4">Attribute Name</th>
                      <th scope="col" className="py-3 px-4">Category Type</th>
                      <th scope="col" className="py-3 px-4">Description</th>
                      <th scope="col" className="py-3 px-4 text-right">Identifier</th>
                      <th scope="col" className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-400">
                          No {label.toLowerCase()} found. Click "+ Add New Attribute" above.
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-4 capitalize text-slate-600">
                            {item.type?.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {item.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                            {item._id.slice(-6)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                aria-label={`Edit attribute ${item.name}`}
                                onClick={() => openEditModal(item)}
                                title="Edit Attribute"
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove attribute ${item.name}`}
                                onClick={() => handleDelete(item._id, item.name)}
                                title="Remove Attribute"
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
          );
        })()
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New {activeTab === 'brands' ? 'Brand' : 'Attribute'}</h3>
              <button
                type="button"
                aria-label="Close add modal"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="create-cat-name" className="block font-medium text-slate-700 mb-1">Name *</label>
                <input
                  id="create-cat-name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={activeTab === 'brands' ? 'e.g. Byredo' : 'e.g. Oriental Floral'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {activeTab === 'brands' && (
                <div>
                  <label htmlFor="create-cat-country" className="block font-medium text-slate-700 mb-1">Country of Origin</label>
                  <input
                    id="create-cat-country"
                    name="country"
                    type="text"
                    autoComplete="off"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g. France, United Kingdom, UAE"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div>
                <label htmlFor="create-cat-desc" className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  id="create-cat-desc"
                  name="description"
                  rows="3"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Notes on history or olfactory characteristics..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Edit {activeTab === 'brands' ? 'Brand' : 'Attribute'}
              </h3>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-cat-name" className="block font-medium text-slate-700 mb-1">Name *</label>
                <input
                  id="edit-cat-name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {activeTab === 'brands' && (
                <div>
                  <label htmlFor="edit-cat-country" className="block font-medium text-slate-700 mb-1">Country of Origin</label>
                  <input
                    id="edit-cat-country"
                    name="country"
                    type="text"
                    autoComplete="off"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div>
                <label htmlFor="edit-cat-desc" className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  id="edit-cat-desc"
                  name="description"
                  rows="3"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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
