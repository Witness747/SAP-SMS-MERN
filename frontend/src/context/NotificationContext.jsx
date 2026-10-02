import React, { createContext, useState, useEffect, useContext } from 'react';
import { notificationService } from '../services/notificationService';
import { urlBase64ToUint8Array } from '../utils/pwa';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [permission, setPermission] = useState(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Add toast helper
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Request browser Web Push permissions
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Push notifications are not supported on this browser/device.', 'warning');
      return false;
    }

    try {
      setIsSubscribing(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        showToast('Notification permission was denied.', 'warning');
        setIsSubscribing(false);
        return false;
      }

      // Fetch VAPID public key from backend
      const res = await notificationService.getVapidKey();
      const vapidKey = res?.data?.publicKey;

      if (!vapidKey) {
        showToast('Browser notifications enabled for in-app alerts (VAPID key not configured on server).', 'info');
        setIsSubscribing(false);
        return true;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // Save subscription to backend
      await notificationService.subscribePush(subscription);
      showToast('Successfully subscribed to academic notifications! 🔔', 'success');
      setIsSubscribing(false);
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      showToast(`Push subscription error: ${error.message}`, 'error');
      setIsSubscribing(false);
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        permission,
        isSubscribing,
        subscribeToPush,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border text-sm font-medium transition-all transform duration-300 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-800'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/90 dark:text-indigo-200 dark:border-indigo-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs uppercase"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
