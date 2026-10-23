import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  CreditCard,
  DollarSign,
  UserCheck,
  Tag,
  BarChart3,
  ShieldCheck,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, can, logout } = useAuth();

  const navSections = [
    {
      title: 'SALES & RETAIL',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, perm: 'dashboard:view' },
        { label: 'Quick Billing', path: '/billing', icon: Receipt, perm: 'sales:create' },
        { label: 'Sales & Invoices', path: '/sales', icon: Receipt, perm: 'sales:view' },
        { label: 'Perfume Clients', path: '/customers', icon: Users, perm: 'customers:view' },
      ],
    },
    {
      title: 'FRAGRANCE CATALOG',
      items: [
        { label: 'Products & SKUs', path: '/products', icon: Package, perm: 'products:view' },
        { label: 'Brands & Families', path: '/catalog', icon: Layers, perm: 'catalog:view' },
        { label: 'Inventory & Stock', path: '/inventory', icon: Boxes, perm: 'inventory:view' },
        { label: 'Purchases (PO)', path: '/purchases', icon: ShoppingCart, perm: 'purchases:view' },
      ],
    },
    {
      title: 'FINANCE & TREASURY',
      items: [
        { label: 'Suppliers (Vendors)', path: '/suppliers', icon: Truck, perm: 'suppliers:view' },
        { label: 'Payments & Ledgers', path: '/payments', icon: CreditCard, perm: 'payments:view' },
        { label: 'Operating Expenses', path: '/expenses', icon: DollarSign, perm: 'expenses:view' },
        { label: 'Executive Reports', path: '/reports', icon: BarChart3, perm: 'reports:view' },
      ],
    },
    {
      title: 'STAFF & ADMINISTRATION',
      items: [
        { label: 'Employee & Payroll', path: '/employees', icon: UserCheck, perm: 'employees:view' },
        { label: 'Offers & Coupons', path: '/offers', icon: Tag, perm: 'offers:view' },
        { label: 'Access & Users', path: '/users', icon: ShieldCheck, perm: 'users:view' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header — Modern Light */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <img src="/favicon.png" alt="SuhaimSoft" className="w-9 h-9 rounded-xl shadow-xs flex-shrink-0" />
            <div>
              <h1 className="font-extrabold tracking-tight text-sm leading-tight text-slate-900 font-sans">
                SUHAIMSOFT
              </h1>
              <p className="text-[11px] font-bold tracking-wide text-blue-600">
                Perfume ERP
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation sidebar"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto no-scrollbar">
          {navSections.map((section) => {
            const filteredItems = section.items.filter((item) => !item.perm || can(item.perm));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase font-mono text-slate-400">
                  {section.title}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center space-x-2.5">
                            <Icon
                              className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-blue-600 text-white shadow-2xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-slate-900">{user?.name || 'Suhaim Ali VP'}</p>
                <span className="inline-block px-1.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {user?.role?.name || 'Master Admin'}
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Sign out of account"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
