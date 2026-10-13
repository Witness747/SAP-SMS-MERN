import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { PRODUCT_NAME } from '../../utils/constants';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Timetable', path: '/timetable', icon: CalendarDays },
  { name: 'Tasks & Homework', path: '/tasks', icon: CheckSquare },
  { name: 'Attendance', path: '/attendance', icon: PieChart },
  { name: 'Subjects', path: '/subjects', icon: BookOpen },
  { name: 'Events & Exams', path: '/events', icon: Calendar },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="app-card fixed left-0 top-0 z-30 hidden min-h-screen w-64 flex-col rounded-none border-y-0 border-l-0 p-4 transition-colors md:flex">
      {/* Brand Logo */}
      <div className="mb-7 flex items-center gap-3 px-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/25">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
            {PRODUCT_NAME}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Student workspace
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary navigation" className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150 focus-visible:outline-offset-1 ${
                  isActive
                    ? 'bg-indigo-50 font-semibold text-indigo-700 shadow-sm border-l-4 border-indigo-600 pl-3 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Academic Status Card (Dev only) */}
      {(import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true') && (
        <div className="app-card-muted rounded-2xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
            <span>Stack</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">MERN</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            MongoDB • Express • React • Node
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
