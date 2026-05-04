// OneSignal initialization for native (iOS/Android) via Capacitor.
// Web is a no-op so the same code runs in the sandbox preview.
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '36a48b08-ef24-43e3-8f26-78f0d7369b6e';

let initialized = false;
let authListenerAttached = false;

export interface OneSignalDebugInfo {
  platform: string;
  available: boolean;
  permission: boolean | null;
  nativePermission: unknown;
  optedIn: boolean | null;
  subscriptionId: string | null;
  token: string | null;
  externalId: string | null;
  oneSignalId: string | null;
  supabaseUserId: string | null;
  error?: string;
}

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

export async function getOneSignalDebugInfo(): Promise<OneSignalDebugInfo> {
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();
    if (!Capacitor.isNativePlatform()) {
      return emptyDebugInfo(platform, user?.id ?? null, false);
    }

    await waitForCordovaReady();
    const mod: any = await import('onesignal-cordova-plugin');
    const OneSignal = mod.default ?? mod;

    if (!initialized) {
      OneSignal.initialize(ONESIGNAL_APP_ID);
      initialized = true;
    }
    await ensureOneSignalSubscription(OneSignal, user?.id);

    const [permission, nativePermission, optedIn, subscriptionId, token, externalId, oneSignalId] = await Promise.all([
      OneSignal.Notifications?.getPermissionAsync?.().catch(() => null) ?? null,
      OneSignal.Notifications?.permissionNative?.().catch(() => null) ?? null,
      OneSignal.User?.pushSubscription?.getOptedInAsync?.().catch(() => null) ?? null,
      OneSignal.User?.pushSubscription?.getIdAsync?.().catch(() => null) ?? null,
      OneSignal.User?.pushSubscription?.getTokenAsync?.().catch(() => null) ?? null,
      OneSignal.User?.getExternalId?.().catch(() => null) ?? null,
      OneSignal.User?.getOnesignalId?.().catch(() => null) ?? null,
    ]);

    return {
      platform,
      available: true,
      permission: typeof permission === 'boolean' ? permission : null,
      nativePermission,
      optedIn: typeof optedIn === 'boolean' ? optedIn : null,
      subscriptionId: subscriptionId || null,
      token: token || null,
      externalId: externalId || null,
      oneSignalId: oneSignalId || null,
      supabaseUserId: user?.id ?? null,
    };
  } catch (e) {
    return {
      ...emptyDebugInfo('native', user?.id ?? null, true),
      error: (e as Error).message,
    };
  }
}

function emptyDebugInfo(platform: string, supabaseUserId: string | null, available: boolean): OneSignalDebugInfo {
  return {
    platform,
    available,
    permission: null,
    nativePermission: null,
    optedIn: null,
    subscriptionId: null,
    token: null,
    externalId: null,
    oneSignalId: null,
    supabaseUserId,
  };
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
