import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import PwaPrompt from '../components/common/PwaPrompt';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BookOpen,
  PieChart,
  Calendar,
  Settings,
  User,
  GraduationCap,
  X,
} from 'lucide-react';

const mobileNavLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Timetable', path: '/timetable', icon: CalendarDays },
  { name: 'Tasks & Homework', path: '/tasks', icon: CheckSquare },
  { name: 'Attendance', path: '/attendance', icon: PieChart },
  { name: 'Subjects', path: '/subjects', icon: BookOpen },
  { name: 'Events & Exams', path: '/events', icon: Calendar },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden text-slate-900 transition-colors dark:text-slate-100" style={{ background: 'var(--app-canvas)' }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`app-card md:hidden fixed top-0 left-0 bottom-0 w-72 rounded-none border-y-0 border-l-0 z-50 p-5 shadow-2xl transform transition-transform duration-200 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">SAP-SMS</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="touch-target rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {mobileNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold border-l-4 border-indigo-600 pl-3 dark:border-indigo-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-screen min-w-0 w-full flex-1 flex-col md:ml-64">
        <PwaPrompt />
        <Navbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-7 md:px-8 md:pb-10 lg:px-10">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
