import React, { useState, useEffect } from 'react';
import { Menu, Bell, AlertTriangle, Info, Receipt, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ setMobileOpen }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifs = () => {
    api.get('/notifications')
      .then((res) => setNotifications(res.data.data.notifications || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.readBy?.includes(user?.id || user?._id)
  ).length;

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifs();
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 bg-white border-b border-slate-200">
      {/* Left: Mobile Toggle & Store Status */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          aria-label="Open mobile menu"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-slate-700">Flagship Boutique</span>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-[11px] text-slate-400">{currentTime}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Quick Billing */}
        <button
          type="button"
          aria-label="Open quick billing"
          onClick={() => navigate('/billing')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Quick Billing</span>
        </button>

        {/* Quick Action Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Toggle quick actions menu"
            aria-expanded={showQuickActions}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Quick Action</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg py-1.5 z-50 bg-white border border-slate-200">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Operations
              </div>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/billing'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="font-medium">New Sale</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/purchases'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="font-medium">Create Purchase Order</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/products'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span className="font-medium">Add Fragrance Formula</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/employees'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium">Employee & Payroll</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/expenses'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="font-medium">Record Operating Expense</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            aria-label="View system notifications"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold rounded-full bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl shadow-lg overflow-hidden z-50 bg-white border border-slate-200">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-3 text-xs flex items-start space-x-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        api.put(`/notifications/${n._id}/read`);
                        fetchNotifs();
                        if (n.link) navigate(n.link);
                        setShowNotifDropdown(false);
                      }}
                    >
                      {n.severity === 'danger' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      ) : n.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{n.title}</p>
                        <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-slate-400 text-[9px] mt-1 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
