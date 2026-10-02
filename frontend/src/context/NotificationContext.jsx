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
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    serviceWorkerRegistered: false,
    browserSubscribed: false,
    serverHasSubscription: false,
    serverRegisteredForBrowser: false,
    pushConfigured: false,
  });

  const refreshSubscriptionStatus = async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const currentPermission = 'Notification' in window ? Notification.permission : 'unsupported';
    setPermission(currentPermission);
    if (!supported) {
      const status = { supported, serviceWorkerRegistered: false, browserSubscribed: false, serverHasSubscription: false, serverRegisteredForBrowser: false, pushConfigured: false };
      setSubscriptionStatus(status);
      return status;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      const response = await notificationService.getSubscriptionStatus(subscription?.endpoint || null);
      const status = { supported, serviceWorkerRegistered: Boolean(registration), ...response.data };
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      const status = { ...subscriptionStatus, supported, statusError: error.message };
      setSubscriptionStatus(status);
      return status;
    }
  };

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
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      showToast('Push notifications are not supported on this browser/device.', 'warning');
      return false;
    }

    try {
      setIsSubscribing(true);
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        showToast('The service worker is not registered. Open the production build over HTTPS or localhost.', 'warning');
        setIsSubscribing(false);
        return false;
      }
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        showToast('Notification permission was denied.', 'warning');
        setIsSubscribing(false);
        return false;
      }

      // Fetch VAPID public key from backend
      const res = await notificationService.getVapidKey();
      const vapidKey = res?.data?.publicKey;

      if (!res?.data?.configured || !vapidKey) {
        showToast('Push is unavailable because VAPID keys are not configured on the server.', 'warning');
        setIsSubscribing(false);
        await refreshSubscriptionStatus();
        return false;
      }

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
      await refreshSubscriptionStatus();
      showToast('Successfully subscribed to academic notifications! 🔔', 'success');
      setIsSubscribing(false);
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      showToast(`Push subscription error: ${error.message}`, 'error');
      await refreshSubscriptionStatus();
      setIsSubscribing(false);
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    setIsUnsubscribing(true);
    try {
      const status = await refreshSubscriptionStatus();
      if (status.statusError) throw new Error(status.statusError);
      let subscription = null;
      let endpointToRemove = null;
      if (status.serverRegisteredForBrowser && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        subscription = registration ? await registration.pushManager.getSubscription() : null;
        endpointToRemove = subscription?.endpoint || null;
      }
      try {
        await notificationService.unsubscribePush(endpointToRemove);
      } finally {
        if (status.serverRegisteredForBrowser && subscription) await subscription.unsubscribe();
      }
      await refreshSubscriptionStatus();
      showToast('Push notifications disabled for this browser and account.', 'success');
      return true;
    } catch (error) {
      showToast(`Could not fully unsubscribe: ${error.message}`, 'error');
      await refreshSubscriptionStatus();
      return false;
    } finally {
      setIsUnsubscribing(false);
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
        isUnsubscribing,
        subscriptionStatus,
        refreshSubscriptionStatus,
        subscribeToPush,
        unsubscribeFromPush,
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
