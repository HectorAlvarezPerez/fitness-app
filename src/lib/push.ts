import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const ENABLED_FLAG = 'fitness-rest-push';

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const isRestPushEnabled = () => localStorage.getItem(ENABLED_FLAG) === 'on';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

const authHeaders = async (): Promise<Record<string, string> | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
};

const post = async (path: string, body: unknown) => {
  const headers = await authHeaders();
  if (!headers) return false;
  try {
    const res = await fetch(`/push/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Request permission, subscribe via the service worker, and register the
// subscription with the push scheduler service. Returns true on success.
export const enableRestPush = async (): Promise<boolean> => {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const ok = await post('subscribe', { subscription });
  localStorage.setItem(ENABLED_FLAG, ok ? 'on' : 'off');
  return ok;
};

export const disableRestPush = async (): Promise<void> => {
  localStorage.setItem(ENABLED_FLAG, 'off');
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    // ignore
  }
  await post('unsubscribe', {});
};

// Schedule (or reschedule) the rest-end push. No-op unless the user opted in.
export const scheduleRestPush = (fireAtMs: number): void => {
  if (!isRestPushEnabled()) return;
  void post('schedule', { fireAt: fireAtMs });
};

export const cancelRestPush = (): void => {
  if (!isRestPushEnabled()) return;
  void post('cancel', {});
};
