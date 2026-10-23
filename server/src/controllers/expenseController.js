import { Expense } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, dateRange } from '../utils/helpers.js';
import { getNextSequence } from '../services/sequenceService.js';
import { logAudit } from '../services/notificationService.js';

export const getExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { isArchived: false, ...dateRange(req.query, 'date') };

  if (req.query.category) filter.category = req.query.category;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.branch) filter.branch = req.query.branch;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy branch'),
    Expense.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(expenses, total, { page, limit }) });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { date, category, amount, paymentMethod, reference, payee, description, attachment, branchId } = req.body;
  if (!category || !amount || !paymentMethod) {
    throw ApiError.badRequest('Category, amount, and payment method are required');
  }

  const number = await getNextSequence('expensePrefix', 'EXP-');
  const expense = new Expense({
    number,
    date: date ? new Date(date) : new Date(),
    category,
    amount: Number(amount),
    paymentMethod,
    reference,
    payee,
    description,
    attachment,
    branch: branchId || req.user?.branch,
    createdBy: req.user?._id,
  });

  await expense.save();
  await logAudit({
    user: req.user,
    action: 'create_expense',
    module: 'expenses',
    entityId: expense._id,
    entityRef: expense.number,
    description: `Recorded expense of ₹${expense.amount} under ${expense.category}`,
    req,
  });

  res.status(201).json({ success: true, message: 'Expense recorded successfully', data: { expense } });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await Expense.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!expense) throw ApiError.notFound('Expense not found');

  await logAudit({
    user: req.user,
    action: 'update_expense',
    module: 'expenses',
    entityId: expense._id,
    entityRef: expense.number,
    description: `Updated expense ${expense.number}`,
    req,
  });

  res.json({ success: true, message: 'Expense updated successfully', data: { expense } });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await Expense.findByIdAndUpdate(id, { isArchived: true }, { new: true });
  if (!expense) throw ApiError.notFound('Expense not found');

  res.json({ success: true, message: 'Expense archived successfully' });
});
