import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  User,
  UserPlus,
  Receipt,
  RotateCcw,
  Check,
  X,
  Loader2,
  Banknote,
  QrCode,
  Building,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Tag,
  Clock,
  Layers,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import InvoiceViewerModal from '../components/InvoiceViewerModal';

// Luxury Perfume Bottle Glyph Icon
const PerfumeIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2h4v3h-4z" />
    <path d="M12 5v3" />
    <rect x="6" y="8" width="12" height="13" rx="3" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M10 14h4" />
  </svg>
);

export default function Billing() {
  const [catalogVariants, setCatalogVariants] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [itemSearchText, setItemSearchText] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'upi' | 'bank'
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  const [loading, setLoading] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Quick Add Customer modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Edit Line Item modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [editQty, setEditQty] = useState('');

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditRate(String(item.unitPrice));
    setEditQty(String(item.quantity));
  };

  const saveEditedItem = (e) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    const rate = Math.max(0, Number(editRate) || 0);
    const qty = Math.max(1, Number(editQty) || 1);

    if (qty > editingItem.currentStock) {
      toast.warning(`Only ${editingItem.currentStock} bottles available in stock`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.variantId === editingItem.variantId
          ? { ...item, unitPrice: rate, quantity: qty }
          : item
      )
    );
    toast.success(`Updated ${editingItem.name}`);
    setEditingItem(null);
  };

  const searchInputRef = useRef(null);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/products/search?q=');
      setCatalogVariants(res.data.data.variants || []);
    } catch {
      toast.error('Failed to load fragrance catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers?limit=200');
      setCustomers(res.data.data.items || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCatalog();
    loadCustomers();
  }, []);

  const handleAddItem = (variant) => {
    if (!variant) return;

    if (variant.currentStock <= 0) {
      toast.error(`"${variant.product?.name || variant.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const exists = prev.find((item) => item.variantId === variant._id);
      if (exists) {
        if (exists.quantity >= variant.currentStock) {
          toast.warning(`Maximum available stock reached (${variant.currentStock} bottles)`);
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variant._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variantId: variant._id,
          sku: variant.sku,
          name: variant.product?.name || 'Fragrance',
          brand: variant.product?.brand?.name || 'Maison',
          spec: variant.name || `${variant.sizeMl}ml ${variant.concentration || 'EDP'}`,
          unitPrice: Number(variant.retailPrice) || 0,
          currentStock: variant.currentStock,
          taxPercent: variant.taxPercent || 0,
          quantity: 1,
        },
      ];
    });

    toast.success(`Added ${variant.product?.name || 'Fragrance'} to invoice`);
  };

  const updateQuantity = (variantId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return item;
          if (nextQty > item.currentStock) {
            toast.warning(`Only ${item.currentStock} available in stock`);
            return { ...item, quantity: item.currentStock };
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const updatePrice = (variantId, newPrice) => {
    const price = Math.max(0, Number(newPrice) || 0);
    setCart((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, unitPrice: price } : item))
    );
  };

  const removeItem = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearBill = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountAmount(0);
    setAmountPaid('');
    setPaymentReference('');
    setNotes('');
    toast.info('Billing form reset');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const grandTotal = Math.max(0, subtotal - discount);
  const effectivePaid = amountPaid !== '' ? Number(amountPaid) : grandTotal;
  const changeDue = Math.max(0, effectivePaid - grandTotal);
  const totalBottles = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Please add at least one fragrance to generate a bill.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: selectedCustomer?._id || undefined,
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
        })),
        cartDiscount: discount,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
        amountPaid: effectivePaid,
        changeDue,
      };

      const res = await api.post('/sales/pos', payload);
      const sale = res.data.data.sale;
      toast.success(`Tax Invoice ${sale.invoiceNo} generated successfully!`);

      // Open in-page Chrome PDF Invoice Viewer immediately
      setViewingInvoice(sale);

      // Reset form
      setCart([]);
      setDiscountAmount(0);
      setPaymentReference('');
      setAmountPaid('');
      setNotes('');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to complete billing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await api.post('/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        type: 'retail',
      });
      const created = res.data.data.customer;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      toast.success(`Customer ${created.name} registered`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to add customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Comprehensive filter across name, SKU, variant spec, barcode, and brand
  const filteredCatalog = catalogVariants.filter((v) => {
    if (!itemSearchText.trim()) return true;
    const q = itemSearchText.toLowerCase();
    const nameMatch = (v.product?.name || '').toLowerCase().includes(q);
    const varNameMatch = (v.name || '').toLowerCase().includes(q);
    const skuMatch = (v.sku || '').toLowerCase().includes(q);
    const barcodeMatch = (v.barcode || '').toLowerCase().includes(q);
    const brandName = (v.product?.brand?.name || '').toLowerCase();
    return nameMatch || varNameMatch || skuMatch || barcodeMatch || brandName.includes(q);
  });

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-10">
      {/* ── TOP HERO BANNER: CLEAN LIGHT EXECUTIVE HEADER ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <PerfumeIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Quick Billing & Invoicing
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                RETAIL COUNTER
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official retail counter checkout &bull; Instant fiscal invoice generation
            </p>
          </div>
        </div>

        {/* Live Status Pills */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Counter 1</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearBill}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN WORKSPACE: 2 COLUMNS (8 COLS CATALOG & TABLE | 4 COLS SETTLEMENT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN (8 COLS): CLIENT, QUICK ADD & ITEMS TABLE ── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Client & Payment Method Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Customer Selector */}
              <div className="md:col-span-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="billing-customer-select" className="text-xs font-bold text-slate-700 flex items-center space-x-1.5 cursor-pointer">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Profile</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ New Client</span>
                  </button>
                </div>
                <select
                  id="billing-customer-select"
                  name="customerId"
                  value={selectedCustomer?._id || ''}
                  onChange={(e) => {
                    const c = customers.find((item) => item._id === e.target.value);
                    setSelectedCustomer(c || null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value="">Walk-in Retail Client (Standard Sale)</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colorful Payment Mode Buttons */}
              <div className="md:col-span-7">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Payment Method
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'cash',
                      label: 'Cash',
                      icon: Banknote,
                      activeClass: 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20',
                      inactiveClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                    },
                    {
                      id: 'card',
                      label: 'Card',
                      icon: CreditCard,
                      activeClass: 'bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/20',
                      inactiveClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
                    },
                    {
                      id: 'upi',
                      label: 'UPI / QR',
                      icon: QrCode,
                      activeClass: 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20',
                      inactiveClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
                    },
                    {
                      id: 'bank',
                      label: 'Bank',
                      icon: Building,
                      activeClass: 'bg-sky-600 text-white border-sky-700 shadow-sm shadow-sky-600/20',
                      inactiveClass: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                          active ? m.activeClass : m.inactiveClass
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Simple Fragrance Search & Select Bar with Quick Add */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  id="billing-search-input"
                  name="searchFragrance"
                  type="text"
                  autoComplete="off"
                  aria-label="Search fragrance by name, brand, or SKU"
                  value={itemSearchText}
                  onChange={(e) => setItemSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredCatalog.length > 0) {
                        handleAddItem(filteredCatalog[0]);
                        setItemSearchText('');
                      }
                    }
                  }}
                  placeholder="Search fragrance by name, brand, or SKU (Press Enter to add)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="w-full sm:w-80">
                <select
                  id="billing-add-fragrance-select"
                  name="variantId"
                  aria-label="Select Fragrance to Add"
                  value={selectedVariantId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) {
                      const v = catalogVariants.find((item) => item._id === id);
                      if (v) handleAddItem(v);
                      setSelectedVariantId('');
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value="">Select Fragrance to Add ({filteredCatalog.length} available)...</option>
                  {filteredCatalog.map((v) => {
                    const isOut = v.currentStock <= 0;
                    return (
                      <option key={v._id} value={v._id} disabled={isOut}>
                        {v.product?.name || v.name} &mdash; {v.name || `${v.sizeMl}ml`} (₹{v.retailPrice?.toLocaleString('en-IN')}) {isOut ? '[OUT OF STOCK]' : `[Stock: ${v.currentStock}]`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Simple Clean Quick Add Row */}
            <div className="flex items-center space-x-2 pt-2.5 border-t border-slate-100 overflow-x-auto scrollbar-none text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                <Plus className="w-3 h-3 text-blue-600" />
                <span>Quick Add:</span>
              </span>
              {catalogVariants
                .filter((v) => v.currentStock > 0)
                .slice(0, 6)
                .map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => handleAddItem(v)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-semibold shrink-0 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <PerfumeIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>{v.product?.name || v.name}</span>
                    <span className="text-slate-400 font-normal">({v.sizeMl ? `${v.sizeMl}ml` : v.name})</span>
                    <span className="font-bold text-blue-600 font-mono">₹{v.retailPrice?.toLocaleString('en-IN')}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* ── EXECUTIVE BILLING ITEMS TABLE ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Billing Line Items
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  {cart.length} {cart.length === 1 ? 'Item' : 'Items'} &bull; {totalBottles} {totalBottles === 1 ? 'Bottle' : 'Bottles'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Verified Fiscal Pricing</span>
            </div>

            <div className="overflow-x-auto">
              <table aria-label="Billing Line Items Table" className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-white">
                    <th scope="col" className="py-3 px-3.5 w-16 text-center whitespace-nowrap">Sl No</th>
                    <th scope="col" className="py-3 px-3.5">Fragrance Details</th>
                    <th scope="col" className="py-3 px-3 text-center whitespace-nowrap">In Stock</th>
                    <th scope="col" className="py-3 px-3 w-28 text-right whitespace-nowrap">Unit Rate (₹)</th>
                    <th scope="col" className="py-3 px-3 w-32 text-center whitespace-nowrap">Quantity</th>
                    <th scope="col" className="py-3 px-3.5 w-28 text-right whitespace-nowrap">Line Total (₹)</th>
                    <th scope="col" className="py-3 px-3 w-20 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-14 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-inner">
                            <ShoppingBag className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-slate-800">Your billing table is ready</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Select any fragrance from the dropdown above to add line items.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <tr key={item.variantId} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-3.5 px-3.5 text-center font-mono text-slate-400 font-bold whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <PerfumeIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <p className="font-extrabold text-slate-900 leading-tight">{item.name}</p>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                                  {item.brand}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {item.spec} &bull; <span className="font-mono text-slate-400">{item.sku}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{item.currentStock} left</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            ₹{item.unitPrice.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() => updateQuantity(item.variantId, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center font-black text-slate-900 font-mono text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() => updateQuantity(item.variantId, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-right font-black text-slate-900 font-mono text-sm whitespace-nowrap">
                          ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              aria-label={`Edit ${item.name} rate and quantity`}
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit item rate & quantity"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name} from bill`}
                              onClick={() => removeItem(item.variantId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove item"
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
        </div>

        {/* ── RIGHT COLUMN (4 COLS): SETTLEMENT & TOTALS REGISTER ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Invoice Settlement</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                FISCAL
              </span>
            </div>

            {/* Subtotal & Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Subtotal ({totalBottles} bottles):</span>
                <span className="font-bold text-slate-800 font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Discount Row & Quick Chips */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">Special Discount (₹):</span>
                  <div className="flex items-center space-x-1">
                    {[100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDiscountAmount(amt)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 cursor-pointer"
                      >
                        -₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="billing-discount"
                  name="discount"
                  autoComplete="off"
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-rose-600 text-xs font-bold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* ── GRAND TOTAL CARD ── */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 block mb-1">
                Net Payable Amount
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-slate-900">GRAND TOTAL:</span>
                <span className="text-2xl font-black text-blue-600 tracking-tight font-mono">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Received & Change */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="billing-amount-paid" className="text-xs font-bold text-slate-700">Amount Tendered / Received:</label>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(String(grandTotal))}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Exact ₹{grandTotal.toLocaleString('en-IN')}
                  </button>
                </div>
                <input
                  id="billing-amount-paid"
                  name="amountPaid"
                  autoComplete="off"
                  type="number"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`₹${grandTotal.toLocaleString('en-IN')}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Change Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-600">Change to Return:</span>
                <span className={`font-mono font-black ${changeDue > 0 ? 'text-emerald-600 text-sm' : 'text-slate-800'}`}>
                  ₹{changeDue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Reference & Notes */}
              <div>
                <label htmlFor="billing-reference" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Reference / Cheque No (Optional)
                </label>
                <input
                  id="billing-reference"
                  name="reference"
                  autoComplete="off"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TXN-9982, UPI Ref"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="billing-notes" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Narration / Notes
                </label>
                <input
                  id="billing-notes"
                  name="notes"
                  autoComplete="off"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarks for customer receipt..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* ── PRIMARY CHECKOUT BUTTON ── */}
            <button
              type="button"
              disabled={cart.length === 0 || loading}
              onClick={handleCheckout}
              className={`w-full py-3.5 px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-md ${
                cart.length === 0 || loading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/25 hover:shadow-lg hover:scale-[1.01] active:scale-98'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Tax Invoice...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Generate & View Tax Invoice</span>
                  <ArrowRight className="w-4 h-4 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── QUICK ADD CUSTOMER MODAL ── */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Register New Client</h3>
              <button
                type="button"
                aria-label="Close client registration modal"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label htmlFor="billing-new-cust-name" className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  id="billing-new-cust-name"
                  name="customerName"
                  autoComplete="name"
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Tariq Mansoor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="billing-new-cust-phone" className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number</label>
                <input
                  id="billing-new-cust-phone"
                  name="customerPhone"
                  autoComplete="tel"
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. +91 98200 12345"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {creatingCustomer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Customer</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK EDIT LINE ITEM MODAL ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Line Item</h3>
                <p className="text-xs text-slate-500">{editingItem.name}</p>
              </div>
              <button
                type="button"
                aria-label="Close edit item modal"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveEditedItem} className="space-y-3">
              <div>
                <label htmlFor="billing-edit-rate" className="text-xs font-semibold text-slate-700 block mb-1">Unit Rate (₹)</label>
                <input
                  id="billing-edit-rate"
                  name="unitRate"
                  autoComplete="off"
                  type="number"
                  min="0"
                  required
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="billing-edit-qty" className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
                <input
                  id="billing-edit-qty"
                  name="quantity"
                  autoComplete="off"
                  type="number"
                  min="1"
                  max={editingItem.currentStock}
                  required
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Available in stock: {editingItem.currentStock} bottles
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">New Line Total:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  ₹{(Number(editRate || 0) * Number(editQty || 1)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white cursor-pointer"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVOICE VIEWER MODAL (Chrome PDF in-page viewer) ── */}
      {viewingInvoice && (
        <InvoiceViewerModal sale={viewingInvoice} onClose={() => setViewingInvoice(null)} />
      )}
    </div>
  );
}
