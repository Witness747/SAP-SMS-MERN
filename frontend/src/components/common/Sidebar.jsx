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
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 p-4 min-h-screen fixed top-0 left-0 z-30 transition-colors">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
            SAP-SMS
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Academic Planner
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Academic Status Card */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
          <span>Stack</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">MERN</span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          MongoDB • Express • React • Node
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
