import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../hooks/useTheme';
import Card, { CardHeader, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  Bell,
  Sun,
  Moon,
  Send,
  Info,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';

const Settings = () => {
  const [preferences, setPreferences] = useState({
    taskReminders: true,
    eventReminders: true,
    attendanceWarnings: true,
    timetableReminders: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const { theme, setTheme } = useTheme();
  const {
    permission, subscribeToPush, unsubscribeFromPush, isSubscribing,
    isUnsubscribing, subscriptionStatus, refreshSubscriptionStatus, showToast,
  } = useNotifications();

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await notificationService.getPreferences();
        if (res.data?.preferences) {
          setPreferences(res.data.preferences);
        }
        await refreshSubscriptionStatus();
      } catch (err) {
        console.warn('Failed to load preferences:', err.message);
      }
    };
    loadPreferences();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      setIsSaving(true);
      await notificationService.updatePreferences(updated);
      showToast('Notification preference saved', 'success', 2000);
    } catch (err) {
      showToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      const res = await notificationService.sendTestNotification();
      const status = res.data?.status;
      if (status === 'sent_to_push_service') {
        showToast('Push service accepted the notification. Browser display is not confirmed.', 'success');
      } else {
        const messages = {
          no_subscription: 'This browser is not registered for this account.',
          vapid_unavailable: 'Push is unavailable because server VAPID keys are not configured.',
          stale_subscription: 'The push service reports this subscription is expired. Subscribe again.',
          push_service_auth_failed: 'The push service rejected the server credentials. Check the VAPID configuration.',
          transient_failure: 'The push service is temporarily unavailable. Try again later.',
          delivery_failed: `Push delivery failed${res.data?.statusCode ? ` (${res.data.statusCode})` : ''}.`,
        };
        showToast(messages[status] || res.message || 'Push delivery failed.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to trigger test notification', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Application Preferences & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure notifications, push subscriptions, theme mode, and system parameters.
        </p>
      </div>

      {/* Notifications Configuration Card */}
      <Card>
        <CardHeader
          title="Notification Preferences"
          subtitle="Control in-app alerts and browser notifications"
          action={
            <Badge
              variant={subscriptionStatus.serverRegisteredForBrowser ? 'success' : 'default'}
              size="sm"
            >
              {subscriptionStatus.serverRegisteredForBrowser
                ? 'Push Registered'
                : permission === 'granted' ? 'Permission Granted' : 'Permission Not Enabled'}
            </Badge>
          }
        />
        <CardContent className="space-y-4">
          {/* Toggles */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                id: 'taskReminders',
                title: 'Task & Assignment Reminders',
                desc: 'Alerts before due dates and overdue warnings',
              },
              {
                id: 'eventReminders',
                title: 'Exam & Event Reminders',
                desc: 'Alerts for upcoming examinations and project presentations',
              },
              {
                id: 'attendanceWarnings',
                title: 'Attendance Deficiency Warnings',
                desc: 'Alerts when subject attendance falls below minimum percentage threshold',
              },
              {
                id: 'timetableReminders',
                title: 'Daily Class Schedule Summary',
                desc: 'Daily briefing of today’s lecture timings and classrooms',
              },
            ].map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={preferences[item.id]}
                    onChange={() => handleToggle(item.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Browser Push Subscription Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              <span>Web Push Notification Service</span>
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              SAP-SMS uses the standard Web Notifications API and Service Worker Push API. Delivery depends on browser support, active permissions, and device battery optimization.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {subscriptionStatus.serverHasSubscription ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unsubscribeFromPush}
                  isLoading={isUnsubscribing}
                >
                  {subscriptionStatus.serverRegisteredForBrowser ? 'Unsubscribe this browser' : 'Clear stale account registration'}
                </Button>
              ) : !subscriptionStatus.supported ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">Push notifications are unsupported in this browser.</span>
              ) : !subscriptionStatus.serviceWorkerRegistered ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">Service worker is not registered for this site.</span>
              ) : !subscriptionStatus.pushConfigured ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">Server VAPID keys are unavailable; browser push cannot be registered.</span>
              ) : (
                <Button
                  size="sm"
                  onClick={subscribeToPush}
                  isLoading={isSubscribing}
                  leftIcon={Bell}
                >
                  {permission === 'granted' ? 'Register This Browser' : 'Enable Browser Push Notifications'}
                </Button>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Permission: {permission} · Browser subscription: {subscriptionStatus.browserSubscribed ? 'present' : 'none'} · Server registration: {subscriptionStatus.serverRegisteredForBrowser ? 'current' : subscriptionStatus.serverHasSubscription ? 'different or stale' : 'none'}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                isLoading={isTesting}
                leftIcon={Send}
              >
                Send Test Alert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Appearance Card */}
      <Card>
        <CardHeader
          title="Display & Theme Preferences"
          subtitle="Customize interface appearance for your study sessions"
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Light Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Crisp high-contrast daytime UI</p>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sleek, eye-friendly night theme</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* System & Architecture Info */}
      <Card>
        <CardHeader
          title="System Architecture (MERN Stack)"
          subtitle="Technology specifications of this deployment"
        />
        <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Server className="w-4 h-4 text-emerald-500" /> Database & Backend
              </span>
              <p>MongoDB Atlas (ODM: Mongoose 8.x)</p>
              <p>Node.js + Express REST API</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Layers className="w-4 h-4 text-indigo-500" /> Frontend Client & PWA
              </span>
              <p>React 18 + Vite + Tailwind CSS</p>
              <p>Service Worker + Web Push</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
