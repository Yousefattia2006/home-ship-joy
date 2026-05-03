// OneSignal initialization for native (iOS/Android) via Capacitor.
// Web is a no-op so the same code runs in the sandbox preview.
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '36a48b08-ef24-43e3-8f26-78f0d7369b6e';

let initialized = false;

export async function initOneSignal() {
  if (initialized) return;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    // Dynamic import so web bundling doesn't choke
    const mod: any = await import('onesignal-cordova-plugin');
    const OneSignal = mod.default ?? mod;

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Ask permission on iOS (Android handled by manifest)
    OneSignal.Notifications.requestPermission(true).catch(() => {});

    initialized = true;

    // Link to the current Supabase user if signed in
    await linkOneSignalToCurrentUser();

    // And re-link when auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        try { OneSignal.login(session.user.id); } catch { /* noop */ }
      } else {
        try { OneSignal.logout(); } catch { /* noop */ }
      }
    });
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) OneSignal.login(user.id);
  } catch { /* noop */ }
}
