/**
 * Progressive Web App (PWA) utilities
 */

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ ServiceWorker registered successfully:', registration.scope);
      return registration;
    } catch (error) {
      console.warn('⚠️ ServiceWorker registration failed:', error);
      return null;
    }
  }
  return null;
};

/**
 * Converts VAPID base64 string to Uint8Array required by pushManager.subscribe()
 */
export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
