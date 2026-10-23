// Canonical list of permission modules and actions.
// A permission key is "<module>:<action>", e.g. "products:create".

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'];

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'products', label: 'Products', actions: ['view', 'create', 'edit', 'delete', 'export', 'print'] },
  { key: 'catalog', label: 'Brands & Categories', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'inventory', label: 'Inventory', actions: ['view', 'create', 'approve', 'export', 'print'] },
  { key: 'suppliers', label: 'Suppliers', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'purchases', label: 'Purchases', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
  { key: 'sales', label: 'Sales & POS', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'] },
  { key: 'payments', label: 'Payments & Accounts', actions: ['view', 'create', 'approve', 'export', 'print'] },
  { key: 'returns', label: 'Returns', actions: ['view', 'create', 'approve', 'print'] },
  { key: 'expenses', label: 'Expenses', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'employees', label: 'Employees', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'offers', label: 'Discounts & Offers', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'reports', label: 'Reports', actions: ['view', 'export', 'print'] },
  { key: 'financials', label: 'Financial figures (cost/profit)', actions: ['view'] },
  { key: 'users', label: 'Users & Roles', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'settings', label: 'Settings', actions: ['view', 'edit'] },
  { key: 'audit', label: 'Audit Logs', actions: ['view', 'export'] },
  { key: 'notifications', label: 'Notifications', actions: ['view'] },
];

export const ALL_PERMISSIONS = MODULES.flatMap((m) => m.actions.map((a) => `${m.key}:${a}`));

const pick = (...keys) => keys.flatMap((k) => (k.endsWith(':*') ? ALL_PERMISSIONS.filter((p) => p.startsWith(k.slice(0, -1))) : [k]));

export const DEFAULT_ROLES = [
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Store manager with access to operations, reports and approvals.',
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith('users:') && !p.startsWith('settings:edit') && !p.startsWith('audit:')),
    isSystem: true,
  },
  {
    name: 'Cashier',
    slug: 'cashier',
    description: 'POS billing, customers and own sales.',
    permissions: pick('dashboard:view', 'products:view', 'customers:view', 'customers:create', 'sales:view', 'sales:create', 'sales:print', 'payments:view', 'payments:create', 'returns:view', 'notifications:view'),
    isSystem: true,
  },
  {
    name: 'Inventory Clerk',
    slug: 'inventory-clerk',
    description: 'Products, stock movements, purchases receiving.',
    permissions: pick('dashboard:view', 'products:*', 'catalog:*', 'inventory:view', 'inventory:create', 'inventory:print', 'suppliers:view', 'purchases:view', 'purchases:create', 'purchases:edit', 'notifications:view'),
    isSystem: true,
  },
  {
    name: 'Accountant',
    slug: 'accountant',
    description: 'Payments, expenses and financial reports.',
    permissions: pick('dashboard:view', 'payments:*', 'expenses:*', 'reports:*', 'financials:view', 'customers:view', 'suppliers:view', 'sales:view', 'purchases:view', 'notifications:view'),
    isSystem: true,
  },
];
