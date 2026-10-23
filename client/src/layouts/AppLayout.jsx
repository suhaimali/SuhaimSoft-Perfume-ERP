import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isWide = location.pathname === '/billing' || location.pathname === '/pos';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col relative">
      <div className="flex flex-1">
        {/* Sidebar navigation */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
          <Navbar setMobileOpen={setMobileOpen} />

          <main className={`flex-1 p-3 sm:p-5 md:p-7 w-full mx-auto ${isWide ? 'max-w-[1700px]' : 'max-w-7xl'}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
