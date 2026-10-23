import { Supplier, Customer, Sale, Purchase, Payment } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, escapeRegex } from '../utils/helpers.js';
import { getNextSequence } from '../services/sequenceService.js';

// SUPPLIERS
export const getSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { company: rx }, { phone: rx }, { email: rx }, { code: rx }];
  }
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(suppliers, total, { page, limit }) });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const { name, company, contactPerson, phone, email, address, gstin, pan, paymentTermsDays, openingBalance, notes } = req.body;
  if (!name) throw ApiError.badRequest('Supplier name is required');

  const code = await getNextSequence('supplierPrefix', 'SUP-');
  const supplier = new Supplier({
    code,
    name,
    company,
    contactPerson,
    phone,
    email,
    address,
    gstin,
    pan,
    paymentTermsDays: paymentTermsDays != null ? Number(paymentTermsDays) : 30,
    openingBalance: Number(openingBalance) || 0,
    outstandingBalance: Number(openingBalance) || 0,
    notes,
  });

  await supplier.save();
  res.status(201).json({ success: true, message: 'Supplier created successfully', data: { supplier } });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!supplier) throw ApiError.notFound('Supplier not found');

  res.json({ success: true, message: 'Supplier updated successfully', data: { supplier } });
});

export const getSupplierLedger = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplier = await Supplier.findById(id);
  if (!supplier) throw ApiError.notFound('Supplier not found');

  const [purchases, payments] = await Promise.all([
    Purchase.find({ supplier: id }).sort({ orderDate: -1 }).limit(50),
    Payment.find({ supplier: id }).sort({ date: -1 }).limit(50),
  ]);

  res.json({ success: true, data: { supplier, purchases, payments } });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) throw ApiError.notFound('Supplier not found');

  res.json({ success: true, message: 'Supplier deleted successfully' });
});


// CUSTOMERS
export const getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { code: rx }];
  }
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(customers, total, { page, limit }) });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, type, group, gstin, billingAddress, shippingAddress, discountPercent, creditLimit, notes } = req.body;
  if (!name) throw ApiError.badRequest('Customer name is required');

  const code = await getNextSequence('customerPrefix', 'CUS-');
  const customer = new Customer({
    code,
    name,
    phone,
    email,
    type: type || 'retail',
    group,
    gstin,
    billingAddress,
    shippingAddress,
    discountPercent: Number(discountPercent) || 0,
    creditLimit: Number(creditLimit) || 0,
    notes,
  });

  await customer.save();
  res.status(201).json({ success: true, message: 'Customer created successfully', data: { customer } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await Customer.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!customer) throw ApiError.notFound('Customer not found');

  res.json({ success: true, message: 'Customer updated successfully', data: { customer } });
});

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await Customer.findById(id);
  if (!customer) throw ApiError.notFound('Customer not found');

  const [sales, payments] = await Promise.all([
    Sale.find({ customer: id }).sort({ saleDate: -1 }).limit(50),
    Payment.find({ customer: id }).sort({ date: -1 }).limit(50),
  ]);

  res.json({ success: true, data: { customer, sales, payments } });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) throw ApiError.notFound('Customer not found');

  res.json({ success: true, message: 'Customer deleted successfully' });
});

