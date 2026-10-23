import { Router } from 'express';
import { authenticate, requirePermission, requireMasterAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

import * as authCtrl from '../controllers/authController.js';
import * as userCtrl from '../controllers/userController.js';
import * as brandCatCtrl from '../controllers/brandCategoryController.js';
import * as prodCtrl from '../controllers/productController.js';
import * as partyCtrl from '../controllers/partyController.js';
import * as invCtrl from '../controllers/inventoryController.js';
import * as purCtrl from '../controllers/purchaseController.js';
import * as saleCtrl from '../controllers/saleController.js';
import * as payCtrl from '../controllers/paymentController.js';
import * as expCtrl from '../controllers/expenseController.js';
import * as empCtrl from '../controllers/employeeController.js';
import * as branchCtrl from '../controllers/branchController.js';
import * as setCtrl from '../controllers/settingsController.js';
import * as repCtrl from '../controllers/reportController.js';
import * as notifAuditCtrl from '../controllers/notificationAuditController.js';

const router = Router();

// --- AUTH ---
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refreshToken);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);

// --- FILE UPLOADS ---
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url: fileUrl, filename: req.file.filename } });
});

// --- DASHBOARD ---
router.get('/dashboard', authenticate, requirePermission('dashboard:view'), repCtrl.getDashboard);

// --- USERS & ROLES ---
router.get('/users', authenticate, requirePermission('users:view'), userCtrl.getUsers);
router.post('/users', authenticate, requirePermission('users:create'), userCtrl.createUser);
router.put('/users/:id', authenticate, requirePermission('users:edit'), userCtrl.updateUser);
router.delete('/users/:id', authenticate, requirePermission('users:edit'), userCtrl.deleteUser);

router.get('/roles', authenticate, requirePermission('users:view'), userCtrl.getRoles);
router.post('/roles', authenticate, requireMasterAdmin, userCtrl.createRole);
router.put('/roles/:id', authenticate, requireMasterAdmin, userCtrl.updateRole);
router.get('/permissions', authenticate, userCtrl.getPermissionsCatalog);

// --- BRANDS & CATEGORIES ---
router.get('/brands', authenticate, requirePermission('catalog:view', 'products:view'), brandCatCtrl.getBrands);
router.post('/brands', authenticate, requirePermission('catalog:create'), brandCatCtrl.createBrand);
router.put('/brands/:id', authenticate, requirePermission('catalog:edit'), brandCatCtrl.updateBrand);
router.delete('/brands/:id', authenticate, requirePermission('catalog:delete'), brandCatCtrl.deleteBrand);

router.get('/categories', authenticate, requirePermission('catalog:view', 'products:view'), brandCatCtrl.getCategories);
router.post('/categories', authenticate, requirePermission('catalog:create'), brandCatCtrl.createCategory);
router.put('/categories/:id', authenticate, requirePermission('catalog:edit'), brandCatCtrl.updateCategory);
router.delete('/categories/:id', authenticate, requirePermission('catalog:delete'), brandCatCtrl.deleteCategory);

// --- PRODUCTS & VARIANTS ---
router.get('/products', authenticate, requirePermission('products:view'), prodCtrl.getProducts);
router.get('/products/search', authenticate, requirePermission('products:view', 'sales:create'), prodCtrl.searchVariants);
router.get('/products/:id', authenticate, requirePermission('products:view'), prodCtrl.getProductById);
router.post('/products', authenticate, requirePermission('products:create'), prodCtrl.createProduct);
router.put('/products/:id', authenticate, requirePermission('products:edit'), prodCtrl.updateProduct);
router.delete('/products/:id', authenticate, requirePermission('products:delete', 'products:edit'), prodCtrl.deleteProduct);
router.post('/products/:productId/variants', authenticate, requirePermission('products:create'), prodCtrl.addVariant);
router.put('/variants/:id', authenticate, requirePermission('products:edit'), prodCtrl.updateVariant);

// --- SUPPLIERS & CUSTOMERS ---
router.get('/suppliers', authenticate, requirePermission('suppliers:view'), partyCtrl.getSuppliers);
router.post('/suppliers', authenticate, requirePermission('suppliers:create'), partyCtrl.createSupplier);
router.put('/suppliers/:id', authenticate, requirePermission('suppliers:edit'), partyCtrl.updateSupplier);
router.delete('/suppliers/:id', authenticate, requirePermission('suppliers:delete', 'suppliers:edit'), partyCtrl.deleteSupplier);
router.get('/suppliers/:id/ledger', authenticate, requirePermission('suppliers:view'), partyCtrl.getSupplierLedger);

router.get('/customers', authenticate, requirePermission('customers:view'), partyCtrl.getCustomers);
router.post('/customers', authenticate, requirePermission('customers:create'), partyCtrl.createCustomer);
router.put('/customers/:id', authenticate, requirePermission('customers:edit'), partyCtrl.updateCustomer);
router.delete('/customers/:id', authenticate, requirePermission('customers:delete', 'customers:edit'), partyCtrl.deleteCustomer);
router.get('/customers/:id/ledger', authenticate, requirePermission('customers:view'), partyCtrl.getCustomerLedger);

// --- INVENTORY ---
router.get('/inventory/levels', authenticate, requirePermission('inventory:view'), invCtrl.getStockLevels);
router.put('/inventory/levels/:id', authenticate, requirePermission('inventory:edit', 'inventory:create'), invCtrl.updateStockLevel);
router.delete('/inventory/levels/:id', authenticate, requirePermission('inventory:delete', 'inventory:create'), invCtrl.deleteStockLevel);
router.get('/inventory/movements', authenticate, requirePermission('inventory:view'), invCtrl.getMovements);
router.put('/inventory/movements/:id', authenticate, requirePermission('inventory:edit', 'inventory:create'), invCtrl.updateMovement);
router.delete('/inventory/movements/:id', authenticate, requirePermission('inventory:delete', 'inventory:create'), invCtrl.deleteMovement);
router.post('/inventory/adjustments', authenticate, requirePermission('inventory:create'), invCtrl.createAdjustment);
router.get('/inventory/transfers', authenticate, requirePermission('inventory:view'), invCtrl.getTransfers);
router.post('/inventory/transfers', authenticate, requirePermission('inventory:create'), invCtrl.createTransfer);

// --- PURCHASES ---
router.get('/purchases', authenticate, requirePermission('purchases:view'), purCtrl.getPurchases);
router.get('/purchases/:id', authenticate, requirePermission('purchases:view'), purCtrl.getPurchaseById);
router.post('/purchases', authenticate, requirePermission('purchases:create'), purCtrl.createPurchase);
router.post('/purchases/:id/receive', authenticate, requirePermission('purchases:edit', 'inventory:create'), purCtrl.receiveItems);
router.post('/purchases/:id/cancel', authenticate, requirePermission('purchases:edit'), purCtrl.cancelPurchase);
router.delete('/purchases/:id', authenticate, requirePermission('purchases:delete', 'purchases:edit'), purCtrl.deletePurchase);

// --- SALES & POS ---
router.get('/sales', authenticate, requirePermission('sales:view'), saleCtrl.getSales);
router.get('/sales/:id', authenticate, requirePermission('sales:view'), saleCtrl.getSaleById);
router.post('/sales/pos', authenticate, requirePermission('sales:create'), saleCtrl.createPosSale);
router.put('/sales/:id', authenticate, requirePermission('sales:edit', 'sales:create'), saleCtrl.updateSale);
router.delete('/sales/:id', authenticate, requirePermission('sales:delete', 'sales:create'), saleCtrl.deleteSale);
router.get('/sales/:id/pdf', authenticate, requirePermission('sales:view', 'sales:print'), saleCtrl.downloadInvoicePdf);
router.post('/sales/:id/return', authenticate, requirePermission('returns:create'), saleCtrl.processSaleReturn);

// --- PAYMENTS & CASH CLOSING ---
router.get('/payments', authenticate, requirePermission('payments:view'), payCtrl.getPayments);
router.post('/payments/customer', authenticate, requirePermission('payments:create'), payCtrl.createCustomerPayment);
router.post('/payments/supplier', authenticate, requirePermission('payments:create'), payCtrl.createSupplierPayment);
router.delete('/payments/:id', authenticate, requirePermission('payments:delete', 'payments:create'), payCtrl.deletePayment);
router.get('/payments/cash-preview', authenticate, requirePermission('payments:view'), payCtrl.getDailyCashPreview);
router.get('/payments/cash-closings', authenticate, requirePermission('payments:view'), payCtrl.getCashClosings);
router.post('/payments/cash-closings', authenticate, requirePermission('payments:create'), payCtrl.submitCashClosing);

// --- EXPENSES ---
router.get('/expenses', authenticate, requirePermission('expenses:view'), expCtrl.getExpenses);
router.post('/expenses', authenticate, requirePermission('expenses:create'), expCtrl.createExpense);
router.put('/expenses/:id', authenticate, requirePermission('expenses:edit', 'expenses:create'), expCtrl.updateExpense);
router.delete('/expenses/:id', authenticate, requirePermission('expenses:delete'), expCtrl.deleteExpense);

// --- EMPLOYEES & PAYROLL ---
router.get('/employees', authenticate, requirePermission('employees:view'), empCtrl.getEmployees);
router.post('/employees', authenticate, requirePermission('employees:create'), empCtrl.createEmployee);
router.put('/employees/:id', authenticate, requirePermission('employees:edit'), empCtrl.updateEmployee);
router.delete('/employees/:id', authenticate, requirePermission('employees:edit'), empCtrl.deleteEmployee);
router.post('/employees/:id/payout', authenticate, requirePermission('employees:edit', 'expenses:create'), empCtrl.recordSalaryPayout);
router.post('/employees/:id/borrow', authenticate, requirePermission('employees:edit'), empCtrl.recordBorrowAdvance);

// --- BRANCHES & WAREHOUSES ---
router.get('/branches', authenticate, branchCtrl.getBranches);
router.post('/branches', authenticate, requirePermission('branches:create'), branchCtrl.createBranch);
router.put('/branches/:id', authenticate, requirePermission('branches:edit'), branchCtrl.updateBranch);
router.delete('/branches/:id', authenticate, requirePermission('branches:edit'), branchCtrl.deleteBranch);
router.get('/warehouses', authenticate, branchCtrl.getWarehouses);
router.post('/warehouses', authenticate, requirePermission('branches:create'), branchCtrl.createWarehouse);
router.put('/warehouses/:id', authenticate, requirePermission('branches:edit'), branchCtrl.updateWarehouse);
router.delete('/warehouses/:id', authenticate, requirePermission('branches:edit'), branchCtrl.deleteWarehouse);

// --- SETTINGS & OFFERS ---
router.get('/settings', authenticate, setCtrl.getSettings);
router.put('/settings', authenticate, requirePermission('settings:edit'), setCtrl.updateSettings);
router.get('/coupons', authenticate, setCtrl.getCoupons);
router.post('/coupons', authenticate, requirePermission('offers:create'), setCtrl.createCoupon);
router.put('/coupons/:id', authenticate, requirePermission('offers:edit'), setCtrl.updateCoupon);
router.delete('/coupons/:id', authenticate, requirePermission('offers:edit'), setCtrl.deleteCoupon);

// --- REPORTS ---
router.get('/reports/sales', authenticate, requirePermission('reports:view'), repCtrl.getSalesAnalytics);
router.get('/reports/profit-loss', authenticate, requirePermission('reports:view', 'financials:view'), repCtrl.getProfitLoss);
router.get('/reports/inventory-valuation', authenticate, requirePermission('reports:view', 'inventory:view'), repCtrl.getInventoryValuation);
router.get('/reports/export/sales-csv', authenticate, requirePermission('reports:export'), repCtrl.exportSalesCsv);

// --- NOTIFICATIONS & AUDIT ---
router.get('/notifications', authenticate, notifAuditCtrl.getNotifications);
router.put('/notifications/:id/read', authenticate, notifAuditCtrl.markNotificationRead);
router.put('/notifications/read-all', authenticate, notifAuditCtrl.markAllNotificationsRead);
router.get('/audit-logs', authenticate, requirePermission('audit:view'), notifAuditCtrl.getAuditLogs);

export default router;
