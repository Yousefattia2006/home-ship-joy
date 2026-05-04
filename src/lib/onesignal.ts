// OneSignal initialization for native (iOS/Android) via Capacitor.
// Web is a no-op so the same code runs in the sandbox preview.
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '36a48b08-ef24-43e3-8f26-78f0d7369b6e';

let initialized = false;
let authListenerAttached = false;

export async function initOneSignal() {
  if (initialized) return;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    await waitForCordovaReady();

    // Dynamic import so web bundling doesn't choke
    const mod: any = await import('onesignal-cordova-plugin');
    const OneSignal = mod.default ?? mod;

    OneSignal.initialize(ONESIGNAL_APP_ID);

    initialized = true;

    // Ask permission, link the current user, then explicitly opt in the
    // push subscription. iOS can take a moment to create the APNs token,
    // so this helper retries once after the native subscription settles.
    await ensureOneSignalSubscription(OneSignal);

    // And re-link when auth state changes
    if (!authListenerAttached) {
      authListenerAttached = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) {
          void ensureOneSignalSubscription(OneSignal, session.user.id);
        } else {
          try { OneSignal.logout(); } catch { /* noop */ }
        }
      });
    }
  } catch {
    // Plugin not available (web preview) — silent
  }
}

export async function linkOneSignalToCurrentUser() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const mod: any = await import('onesignal-cordova-plugin');
    const OneSignal = mod.default ?? mod;
    await ensureOneSignalSubscription(OneSignal);
  } catch { /* noop */ }
}

async function ensureOneSignalSubscription(OneSignal: any, knownUserId?: string) {
  const userId = knownUserId ?? (await supabase.auth.getUser()).data.user?.id;

  if (userId) {
    try { OneSignal.login(userId); } catch { /* noop */ }
  }

  const hasPermission = await OneSignal.Notifications?.getPermissionAsync?.().catch(() => false);
  if (!hasPermission) {
    await OneSignal.Notifications?.requestPermission?.(true).catch(() => false);
  }

  try { OneSignal.User?.pushSubscription?.optIn?.(); } catch { /* noop */ }

  // Give iOS/APNs time to return a push token, then re-apply login/opt-in so
  // the OneSignal external_id and subscription are both active together.
  await delay(1500);
  if (userId) {
    try { OneSignal.login(userId); } catch { /* noop */ }
  }
  try { OneSignal.User?.pushSubscription?.optIn?.(); } catch { /* noop */ }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForCordovaReady() {
  if (typeof window === 'undefined') return;
  if ((window as any).cordova?.exec) return;

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 4000);
    document.addEventListener(
      'deviceready',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}
