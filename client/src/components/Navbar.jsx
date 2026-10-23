import React, { useState, useEffect } from 'react';
import { Menu, Bell, Plus, Search, AlertTriangle, Info, X, Receipt, ChevronDown, PerfumeBottle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ setMobileOpen }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-7 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {/* Left: Mobile Toggle & Status */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          aria-label="Open mobile menu"
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live Perfume ERP Single Store Clock Widget */}
        <div className="hidden sm:flex items-center space-x-3 text-xs">
          <div className="relative flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
              <PerfumeBottle className="w-3.5 h-3.5 text-blue-600" />
              <span>SuhaimSoft Perfume ERP</span>
            </div>
            <span className="text-slate-300">&bull;</span>
            <span className="font-semibold text-slate-600">Flagship Boutique</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-bold text-slate-700">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Quick Billing Launch Button */}
        <button
          type="button"
          aria-label="Open quick billing"
          onClick={() => navigate('/billing')}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Receipt className="w-4 h-4" />
          <span className="tracking-wide">Quick Billing</span>
        </button>

        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Toggle quick actions menu"
            aria-expanded={showQuickActions}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Quick Action</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl py-2 z-50 bg-white border border-slate-200">
              <div className="px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Operations
              </div>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/billing'); }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="font-medium">New POS Terminal Sale</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/purchases'); }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="font-medium">Create Purchase Order</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/products'); }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span className="font-medium">Add Fragrance Formula</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/employees'); }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium">Employee & Payroll</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickActions(false); navigate('/expenses'); }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer transition-colors text-slate-700"
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
            className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full shadow-xs bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl shadow-xl overflow-hidden z-50 bg-white border border-slate-200">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900">Alerts & Updates</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-blue-600 cursor-pointer hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new system notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-3 text-xs flex items-start space-x-3 hover:bg-slate-50 transition-colors cursor-pointer"
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
