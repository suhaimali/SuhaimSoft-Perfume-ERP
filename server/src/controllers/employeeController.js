import { Employee, Expense } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged, escapeRegex } from '../utils/helpers.js';
import { getNextSequence } from '../services/sequenceService.js';
import { logAudit } from '../services/notificationService.js';

export const getEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { employeeCode: rx }, { phone: rx }, { email: rx }];
  }
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.status) filter.status = req.query.status;

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('branch user'),
    Employee.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(employees, total, { page, limit }) });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const { name, jobTitle, department, phone, email, address, branch, user, joinDate, salary, bankAccount, emergencyContact, notes } = req.body;
  if (!name) throw ApiError.badRequest('Employee name is required');

  const employeeCode = await getNextSequence('employeePrefix', 'EMP-');
  const emp = new Employee({
    employeeCode,
    name,
    jobTitle: jobTitle || 'Sales Associate & Fragrance Advisor',
    department: department || 'Retail Sales',
    phone,
    email,
    address,
    branch: branch || undefined,
    user: user || undefined,
    joinDate: joinDate ? new Date(joinDate) : new Date(),
    salary: salary != null ? Number(salary) : 0,
    advanceBalance: 0,
    bankAccount,
    emergencyContact,
    notes,
    borrowHistory: [],
    payrollHistory: [],
  });

  await emp.save();
  res.status(201).json({ success: true, message: 'Employee profile created successfully', data: { employee: emp } });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const emp = await Employee.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).populate('branch user');
  if (!emp) throw ApiError.notFound('Employee not found');

  res.json({ success: true, message: 'Employee details updated successfully', data: { employee: emp } });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const emp = await Employee.findByIdAndUpdate(id, { status: 'resigned' }, { new: true });
  if (!emp) throw ApiError.notFound('Employee not found');

  res.json({ success: true, message: 'Employee archived successfully' });
});

export const recordSalaryPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { month, baseSalary, advanceDeduction, bonus, paymentMethod, reference, notes, recordAsExpense } = req.body;

  const emp = await Employee.findById(id);
  if (!emp) throw ApiError.notFound('Employee not found');

  const bSal = Number(baseSalary || emp.salary || 0);
  const advDed = Math.min(Number(advanceDeduction || 0), emp.advanceBalance || 0);
  const bon = Number(bonus || 0);
  const netPaid = Math.max(0, bSal - advDed + bon);

  let expenseRef = null;
  if (recordAsExpense !== false && netPaid > 0) {
    const expNumber = await getNextSequence('expensePrefix', 'EXP-');
    const expense = new Expense({
      number: expNumber,
      date: new Date(),
      category: 'salaries',
      amount: netPaid,
      paymentMethod: paymentMethod || 'bank',
      reference: reference || `SALARY-${emp.employeeCode}-${month}`,
      payee: emp.name,
      description: `Salary payout for ${emp.name} (${emp.employeeCode}) for ${month}. Base: ₹${bSal}, Deductions: ₹${advDed}, Bonus: ₹${bon}.`,
      branch: emp.branch || req.user?.branch,
      createdBy: req.user?._id,
    });
    await expense.save();
    expenseRef = expense._id;
  }

  // Deduct advance balance if applicable
  if (advDed > 0) {
    emp.advanceBalance = Math.max(0, (emp.advanceBalance || 0) - advDed);
    let remainingToSettle = advDed;
    for (const item of emp.borrowHistory) {
      if (item.status !== 'settled' && remainingToSettle > 0) {
        const unSettled = item.amount - (item.settledAmount || 0);
        if (remainingToSettle >= unSettled) {
          remainingToSettle -= unSettled;
          item.settledAmount = item.amount;
          item.status = 'settled';
        } else {
          item.settledAmount = (item.settledAmount || 0) + remainingToSettle;
          item.status = 'partially_deducted';
          remainingToSettle = 0;
        }
      }
    }
  }

  emp.payrollHistory.unshift({
    month: month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    baseSalary: bSal,
    advanceDeduction: advDed,
    bonus: bon,
    netPaid,
    paymentDate: new Date(),
    paymentMethod: paymentMethod || 'bank',
    reference,
    notes,
    expenseRef,
  });

  await emp.save();
  await emp.populate('branch user');

  res.json({
    success: true,
    message: `Salary of ₹${netPaid.toLocaleString('en-IN')} paid successfully to ${emp.name}`,
    data: { employee: emp },
  });
});

export const recordBorrowAdvance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, date, reason, paymentMethod, notes } = req.body;

  if (!amount || Number(amount) <= 0) {
    throw ApiError.badRequest('Advance borrow amount must be greater than 0');
  }

  const emp = await Employee.findById(id);
  if (!emp) throw ApiError.notFound('Employee not found');

  const borrowAmount = Number(amount);
  emp.advanceBalance = (emp.advanceBalance || 0) + borrowAmount;

  emp.borrowHistory.unshift({
    amount: borrowAmount,
    date: date ? new Date(date) : new Date(),
    reason: reason || 'Salary advance / loan',
    status: 'pending',
    settledAmount: 0,
    paymentMethod: paymentMethod || 'cash',
    notes,
  });

  await emp.save();
  await emp.populate('branch user');

  res.json({
    success: true,
    message: `Advance borrow of ₹${borrowAmount.toLocaleString('en-IN')} recorded for ${emp.name}`,
    data: { employee: emp },
  });
});
