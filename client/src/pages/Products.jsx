import React, { useState, useEffect } from 'react';
import {
  PerfumeBottle,
  Plus,
  Search,
  Filter,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [families, setFamilies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    perfumeCode: '',
    brand: '',
    fragranceFamily: '',
    gender: 'unisex',
    fragranceName: '',
    description: '',
    topNotes: '',
    heartNotes: '',
    baseNotes: '',
    variants: [
      { sku: '', sizeMl: 100, concentration: 'EDP', purchaseCost: 15000, retailPrice: 22000, wholesalePrice: 18000, openingStock: 10, minStock: 3 },
    ],
  });

  const fetchProducts = () => {
    setLoading(true);
    let url = `/products?search=${encodeURIComponent(search)}`;
    if (selectedBrand) url += `&brand=${selectedBrand}`;

    api.get(url)
      .then((res) => setProducts(res.data.data.items || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedBrand]);

  useEffect(() => {
    api.get('/brands').then((res) => setBrands(res.data.data.items || []));
    api.get('/categories?type=fragrance_family').then((res) => setFamilies(res.data.data.categories || []));
  }, []);

  const addVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { sku: '', sizeMl: 50, concentration: 'EDP', purchaseCost: 10000, retailPrice: 15000, wholesalePrice: 12000, openingStock: 5, minStock: 2 },
      ],
    }));
  };

  const removeVariantRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleVariantChange = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const [editProduct, setEditProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    perfumeCode: '',
    brand: '',
    fragranceFamily: '',
    gender: 'unisex',
    fragranceName: '',
    description: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEditModal = (p) => {
    setEditProduct(p);
    setEditFormData({
      name: p.name || '',
      perfumeCode: p.perfumeCode || '',
      brand: p.brand?._id || p.brand || '',
      fragranceFamily: p.fragranceFamily?._id || p.fragranceFamily || '',
      gender: p.gender || 'unisex',
      fragranceName: p.fragranceName || '',
      description: p.description || '',
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    setEditSaving(true);
    try {
      await api.put(`/products/${editProduct._id}`, editFormData);
      toast.success(`Product ${editFormData.name} updated successfully`);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${deleteProduct._id}`);
      toast.success(`Product ${deleteProduct.name} deleted successfully`);
      setDeleteProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', formData);
      toast.success('Fragrance product created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        perfumeCode: '',
        brand: '',
        fragranceFamily: '',
        gender: 'unisex',
        fragranceName: '',
        description: '',
        topNotes: '',
        heartNotes: '',
        baseNotes: '',
        variants: [
          { sku: '', sizeMl: 100, concentration: 'EDP', purchaseCost: 15000, retailPrice: 22000, wholesalePrice: 18000, openingStock: 10, minStock: 3 },
        ],
      });
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] flex items-center space-x-2">
            <span>Fragrance Products</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {products.length} Fragrances
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Manage luxury perfume collections, multi-size bottle variants, SKUs, and stock balances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Fragrance Product</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <label htmlFor="products-search-input" className="sr-only">
            Search fragrances
          </label>
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#94A3B8]" />
          <input
            id="products-search-input"
            name="search"
            type="text"
            autoComplete="off"
            aria-label="Search by perfume name, fragrance code, or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by perfume name, fragrance code, or SKU..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
          />
        </div>

        <div className="w-full sm:w-56">
          <label htmlFor="products-brand-filter" className="sr-only">
            Filter by brand
          </label>
          <select
            id="products-brand-filter"
            name="brand"
            aria-label="Filter by perfume brand"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600 shadow-xs"
          >
            <option value="">All Perfume Brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table aria-label="Fragrance Products Table" className="w-full text-left text-xs">
            <caption className="sr-only">Fragrance Products Directory</caption>
            <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th scope="col" className="px-5 py-3.5">Perfume & Fragrance</th>
                <th scope="col" className="px-4 py-3.5">Brand & Family</th>
                <th scope="col" className="px-4 py-3.5">Gender</th>
                <th scope="col" className="px-4 py-3.5">Variants & Pricing</th>
                <th scope="col" className="px-4 py-3.5 text-right">Available Stock</th>
                <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#94A3B8]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading fragrances...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-[#94A3B8]">
                    No fragrance products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const totalStock = p.variants?.reduce((sum, v) => sum + (v.currentStock || 0), 0) || 0;
                  return (
                    <tr key={p._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#0F172A] text-sm">{p.name}</p>
                        <p className="text-[11px] text-[#64748B]">{p.fragranceName || p.perfumeCode}</p>
                        <span className="text-[10px] text-[#94A3B8]">Code: {p.perfumeCode}</span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-blue-600">{p.brand?.name || 'N/A'}</p>
                        <p className="text-[10px] text-[#64748B]">{p.fragranceFamily?.name || 'Standard'}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                          {p.gender}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {p.variants?.map((v) => (
                            <div key={v._id} className="flex items-center space-x-2 text-[11px]">
                              <span className="font-semibold text-[#1E293B]">{v.sizeMl}ml {v.concentration}:</span>
                              <span className="text-emerald-700 font-bold">₹{v.retailPrice?.toLocaleString('en-IN')}</span>
                              <span className="text-[10px] text-[#64748B]">({v.currentStock || 0} in stock)</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-base text-[#0F172A]">{totalStock} <span className="text-xs text-[#64748B] font-normal">bottles</span></p>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {totalStock <= 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : totalStock <= 5 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            aria-label={`Edit fragrance ${p.name}`}
                            onClick={() => openEditModal(p)}
                            title="Edit Fragrance Product"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 transition-colors shadow-xs cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete fragrance ${p.name}`}
                            onClick={() => setDeleteProduct(p)}
                            title="Delete Fragrance Product"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center space-x-2">
                <PerfumeBottle className="w-4 h-4 text-blue-600" />
                <span>Add New Fragrance Product</span>
              </h3>
              <button
                type="button"
                aria-label="Close create product modal"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-prod-name" className="block text-xs font-medium text-[#334155] mb-1">Fragrance Name *</label>
                  <input
                    id="create-prod-name"
                    name="name"
                    type="text"
                    autoComplete="off"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Baccarat Rouge 540"
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="create-prod-code" className="block text-xs font-medium text-[#334155] mb-1">Perfume Code *</label>
                  <input
                    id="create-prod-code"
                    name="perfumeCode"
                    type="text"
                    autoComplete="off"
                    required
                    value={formData.perfumeCode}
                    onChange={(e) => setFormData({ ...formData, perfumeCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. MFK-BR540"
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] uppercase focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="create-prod-brand" className="block text-xs font-medium text-[#334155] mb-1">Brand House *</label>
                  <select
                    id="create-prod-brand"
                    name="brand"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Perfume Brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="create-prod-family" className="block text-xs font-medium text-[#334155] mb-1">Fragrance Family</label>
                  <select
                    id="create-prod-family"
                    name="fragranceFamily"
                    value={formData.fragranceFamily}
                    onChange={(e) => setFormData({ ...formData, fragranceFamily: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Fragrance Family</option>
                    {families.map((f) => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fragrance Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="create-prod-top-notes" className="block text-[11px] text-[#64748B] mb-1 font-medium">Top Notes</label>
                  <input
                    id="create-prod-top-notes"
                    name="topNotes"
                    type="text"
                    autoComplete="off"
                    value={formData.topNotes}
                    onChange={(e) => setFormData({ ...formData, topNotes: e.target.value })}
                    placeholder="Saffron, Jasmine"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="create-prod-heart-notes" className="block text-[11px] text-[#64748B] mb-1 font-medium">Heart Notes</label>
                  <input
                    id="create-prod-heart-notes"
                    name="heartNotes"
                    type="text"
                    autoComplete="off"
                    value={formData.heartNotes}
                    onChange={(e) => setFormData({ ...formData, heartNotes: e.target.value })}
                    placeholder="Cedarwood, Amberwood"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="create-prod-base-notes" className="block text-[11px] text-[#64748B] mb-1 font-medium">Base Notes</label>
                  <input
                    id="create-prod-base-notes"
                    name="baseNotes"
                    type="text"
                    autoComplete="off"
                    value={formData.baseNotes}
                    onChange={(e) => setFormData({ ...formData, baseNotes: e.target.value })}
                    placeholder="Fir Resin, Ambergris"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Variants Section */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Bottle Sizes & Variants</span>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Size Variant</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-6 gap-2 items-center text-xs">
                      <div className="col-span-2">
                        <label htmlFor={`var-sku-${idx}`} className="block text-[10px] text-[#64748B]">SKU *</label>
                        <input
                          id={`var-sku-${idx}`}
                          name={`sku-${idx}`}
                          type="text"
                          autoComplete="off"
                          required
                          value={v.sku}
                          onChange={(e) => handleVariantChange(idx, 'sku', e.target.value.toUpperCase())}
                          placeholder="e.g. BR540-100ML"
                          className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label htmlFor={`var-size-${idx}`} className="block text-[10px] text-[#64748B]">Size (ml)</label>
                        <input
                          id={`var-size-${idx}`}
                          name={`sizeMl-${idx}`}
                          type="number"
                          autoComplete="off"
                          required
                          value={v.sizeMl}
                          onChange={(e) => handleVariantChange(idx, 'sizeMl', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label htmlFor={`var-cost-${idx}`} className="block text-[10px] text-[#64748B]">Cost (₹)</label>
                        <input
                          id={`var-cost-${idx}`}
                          name={`purchaseCost-${idx}`}
                          type="number"
                          autoComplete="off"
                          required
                          value={v.purchaseCost}
                          onChange={(e) => handleVariantChange(idx, 'purchaseCost', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label htmlFor={`var-retail-${idx}`} className="block text-[10px] text-[#64748B]">Retail (₹)</label>
                        <input
                          id={`var-retail-${idx}`}
                          name={`retailPrice-${idx}`}
                          type="number"
                          autoComplete="off"
                          required
                          value={v.retailPrice}
                          onChange={(e) => handleVariantChange(idx, 'retailPrice', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A]"
                        />
                      </div>
                      <div className="flex items-center space-x-1 pt-1 col-span-2 sm:col-span-1">
                        <div className="flex-1">
                          <label htmlFor={`var-open-${idx}`} className="block text-[10px] text-[#64748B]">Opening</label>
                          <input
                            id={`var-open-${idx}`}
                            name={`openingStock-${idx}`}
                            type="number"
                            autoComplete="off"
                            value={v.openingStock}
                            onChange={(e) => handleVariantChange(idx, 'openingStock', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A]"
                          />
                        </div>
                        {formData.variants.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove variant row ${idx + 1}`}
                            onClick={() => removeVariantRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 mt-3 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save Product & Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fragrance Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Edit Fragrance Product</h3>
                  <p className="text-[11px] text-[#64748B]">Update product classification, brand, and specifications</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close edit product modal"
                onClick={() => setEditProduct(null)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-prod-name" className="block font-medium text-[#334155] mb-1">Fragrance Name *</label>
                  <input
                    id="edit-prod-name"
                    name="name"
                    type="text"
                    autoComplete="off"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-prod-code" className="block font-medium text-[#334155] mb-1">Perfume Code *</label>
                  <input
                    id="edit-prod-code"
                    name="perfumeCode"
                    type="text"
                    autoComplete="off"
                    required
                    value={editFormData.perfumeCode}
                    onChange={(e) => setEditFormData({ ...editFormData, perfumeCode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-prod-brand" className="block font-medium text-[#334155] mb-1">Brand</label>
                  <select
                    id="edit-prod-brand"
                    name="brand"
                    value={editFormData.brand}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-prod-family" className="block font-medium text-[#334155] mb-1">Olfactory Family</label>
                  <select
                    id="edit-prod-family"
                    name="fragranceFamily"
                    value={editFormData.fragranceFamily}
                    onChange={(e) => setEditFormData({ ...editFormData, fragranceFamily: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Family</option>
                    {families.map((f) => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-prod-gender" className="block font-medium text-[#334155] mb-1">Gender</label>
                  <select
                    id="edit-prod-gender"
                    name="gender"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] capitalize focus:outline-none focus:border-blue-500"
                  >
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-prod-sub-title" className="block font-medium text-[#334155] mb-1">Commercial Sub-Title / Olfactory Notes</label>
                <input
                  id="edit-prod-sub-title"
                  name="fragranceName"
                  type="text"
                  autoComplete="off"
                  value={editFormData.fragranceName}
                  onChange={(e) => setEditFormData({ ...editFormData, fragranceName: e.target.value })}
                  placeholder="e.g. Amber Floral, Oud Satin"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-prod-desc" className="block font-medium text-[#334155] mb-1">Description</label>
                <textarea
                  id="edit-prod-desc"
                  name="description"
                  autoComplete="off"
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Fragrance Product Confirmation Modal */}
      {deleteProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Delete Fragrance Product?</h3>
                <p className="text-xs text-[#64748B]">This action permanently removes the perfume catalog item</p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1 text-xs mb-4">
              <p className="font-bold text-[#0F172A]">{deleteProduct.name}</p>
              <p className="text-[#64748B]">Code: <span className="font-mono text-[#0F172A]">{deleteProduct.perfumeCode}</span></p>
              <p className="text-[#64748B]">Brand: <span className="font-medium text-[#0F172A]">{deleteProduct.brand?.name || 'N/A'}</span></p>
              <p className="text-rose-600 text-[11px] font-medium pt-1">
                Warning: All variants and associated catalog specifications will be deleted.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
