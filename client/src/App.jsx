import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Catalog from './pages/Catalog';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Offers from './pages/Offers';
import Reports from './pages/Reports';
import Users from './pages/Users';

function ProtectedRoute({ children, permission }) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading SuhaimSoft ERP...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        visibleToasts={1}
        duration={2500}
        theme="light"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)',
            fontSize: '12px',
            fontWeight: '600',
            padding: '10px 14px',
            zIndex: 999999,
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/billing" element={<ProtectedRoute permission="sales:create"><Billing /></ProtectedRoute>} />
            <Route path="/pos" element={<Navigate to="/billing" replace />} />
            <Route path="/products" element={<ProtectedRoute permission="products:view"><Products /></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute permission="catalog:view"><Catalog /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute permission="inventory:view"><Inventory /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute permission="purchases:view"><Purchases /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute permission="sales:view"><Sales /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute permission="customers:view"><Customers /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute permission="suppliers:view"><Suppliers /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute permission="payments:view"><Payments /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute permission="expenses:view"><Expenses /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute permission="employees:view"><Employees /></ProtectedRoute>} />
            <Route path="/offers" element={<ProtectedRoute permission="offers:view"><Offers /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute permission="reports:view"><Reports /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute permission="users:view"><Users /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
