import { useCallback, useEffect, useState } from 'react';
import { ApiError, notificationsApi } from '../services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = NotificationPermission | 'unsupported';

export function usePushNotifications(isAuthenticated: boolean) {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<PushPermissionState>(() =>
    isSupported ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [configuredInEnv, setConfiguredInEnv] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const syncSubscriptionState = useCallback(async () => {
    if (!isSupported || !isAuthenticated) {
      setIsSubscribed(false);
      return;
    }

    setPermission(Notification.permission);
    try {
      const [config, reg] = await Promise.all([
        notificationsApi.getPushConfig(),
        navigator.serviceWorker.register('/sw.js', { scope: '/' }),
      ]);
      setConfiguredInEnv(config.configuredInEnv);

      const existing = await reg.pushManager.getSubscription();
      if (existing && Notification.permission === 'granted') {
        setIsSubscribed(true);
        // Ensure server has current device subscription saved for the active account
        notificationsApi.subscribePush(existing.toJSON()).catch(() => {});
      } else {
        setIsSubscribed(false);
      }
    } catch {
      setIsSubscribed(false);
    }
  }, [isAuthenticated, isSupported]);

  useEffect(() => {
    syncSubscriptionState();
  }, [syncSubscriptionState]);

  const enablePush = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!isSupported) {
      const msg = 'Push notifications are not supported in this browser. On iPhone, add CampusConnect to your Home Screen first.';
      setError(msg);
      return { ok: false, message: msg };
    }

    setBusy(true);
    setError('');
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        const msg =
          result === 'denied'
            ? 'Notifications are blocked in your browser settings. Enable them in Site Settings to receive phone alerts.'
            : 'Notification permission was dismissed.';
        setError(msg);
        return { ok: false, message: msg };
      }

      const config = await notificationsApi.getPushConfig();
      setConfiguredInEnv(config.configuredInEnv);
      if (!config.publicKey) {
        const msg = 'Push server key is unavailable right now.';
        setError(msg);
        return { ok: false, message: msg };
      }

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Re-subscribe if server VAPID key changed
        try {
          await subscription.unsubscribe();
        } catch {
          // ignore
        }
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });

      await notificationsApi.subscribePush(subscription.toJSON());
      setIsSubscribed(true);
      return { ok: true, message: 'Phone notifications enabled on this device.' };
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not enable push notifications on this browser.';
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setBusy(false);
    }
  }, [isSupported]);

  const disablePush = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!isSupported) return { ok: false, message: 'Unsupported browser.' };
    setBusy(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await notificationsApi.unsubscribePush(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      return { ok: true, message: 'Phone notifications paused on this device.' };
    } catch {
      return { ok: false, message: 'Unable to disable notifications.' };
    } finally {
      setBusy(false);
    }
  }, [isSupported]);

  const sendTestPush = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setBusy(true);
    try {
      const res = await notificationsApi.testPush();
      if (res.sent > 0) {
        return { ok: true, message: 'Test notification sent to your device!' };
      }
      return {
        ok: false,
        message: 'No active push subscription found on the server. Try enabling alerts again.',
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof ApiError ? err.message : 'Unable to send test notification.',
      };
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    configuredInEnv,
    busy,
    error,
    enablePush,
    disablePush,
    sendTestPush,
  };
}
