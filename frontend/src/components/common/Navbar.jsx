import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { Sun, Moon, Bell, LogOut, User as UserIcon, Menu, X, CheckCircle } from 'lucide-react';
import { getInitials } from '../../utils/formatters';

const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { permission, subscribeToPush, isSubscribing } = useNotifications();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="glass sticky top-0 z-20 border-x-0 border-t-0 transition-colors">
      <div className="flex min-h-[64px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        {/* Left: Mobile menu button & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="touch-target flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-base truncate">
              Academic Planner
            </h2>
            <p className="hidden pt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:block truncate">
              Welcome back, <span className="font-medium text-slate-700 dark:text-slate-300">{user?.name || 'Student'}</span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2.5">
          {/* Notification Button */}
          <button
            onClick={subscribeToPush}
            disabled={isSubscribing}
            title={permission === 'granted' ? 'Notifications active' : 'Enable notifications'}
            className="relative touch-target flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={permission === 'granted' ? 'Notifications are active' : 'Enable notifications'}
            aria-pressed={permission === 'granted'}
          >
            <Bell className="w-5 h-5" />
            {permission === 'granted' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* User Profile Avatar & Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="touch-target flex min-h-[40px] items-center gap-1.5 rounded-xl p-1 transition-colors hover:bg-slate-100 focus-visible:outline-offset-2 dark:hover:bg-slate-800 sm:gap-2 sm:pl-2"
              aria-label="Open account menu"
              aria-expanded={showUserDropdown}
            >
              <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name?.split(' ')[0]}
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {getInitials(user?.name)}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="app-card absolute right-0 z-40 mt-2 w-56 rounded-2xl p-2 animate-scale-up">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
