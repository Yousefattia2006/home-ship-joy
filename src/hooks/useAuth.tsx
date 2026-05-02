import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'store' | 'driver' | 'admin';

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
};

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  try {
    const body = await (error as { context?: { json?: () => Promise<{ error?: unknown }> } })?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // Fall back to the standard error message below.
  }
  return getErrorMessage(error) || fallback;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authVersion = 0;

    const fetchRole = async (authUser: User): Promise<AppRole | null> => {
      try {
        const userId = authUser.id;
        // Use the SECURITY DEFINER RPC so role checks do not depend on client-side RLS reads.
        const roleChecks = await Promise.all(
          (['admin', 'driver', 'store'] as const).map(async (candidate) => {
            const { data } = await withTimeout(
              supabase.rpc('has_role', { _user_id: userId, _role: candidate }),
              3000,
              'Role check timed out.'
            ).catch(() => ({ data: false }));
            return data ? candidate : null;
          }),
        );

        const matchedRole = roleChecks.find(Boolean);
        if (matchedRole) return matchedRole;

        const metadataRole = authUser.user_metadata?.selected_role;
        if (metadataRole === 'store' || metadataRole === 'driver') {
          const { data } = await withTimeout(
            supabase.rpc('has_role', { _user_id: userId, _role: metadataRole }),
            3000,
            'Role check timed out.'
          ).catch(() => ({ data: false }));
          if (data) return metadataRole;
        }

        // Fallback for old accounts if role rows are missing.
        const [storeRes, driverRes] = await Promise.all([
          supabase.from('store_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
          supabase.from('driver_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
        ]);

        if (storeRes.data) return 'store';
        if (driverRes.data) return 'driver';

        return null;
      } catch {
        return null;
      }
    };

    const resolveSession = async (sessionUser: User | null, version: number) => {
      if (!mounted || version !== authVersion) return;
      setUser(sessionUser);

      if (!sessionUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRole = await withTimeout(
        fetchRole(sessionUser),
        5000,
        'Role check took too long.'
      ).catch(() => null);

      if (!mounted || version !== authVersion) return;
      console.log('[useAuth] resolved role:', userRole);
      setRole(userRole);
      setLoading(false);
    };

    const bootstrap = async () => {
      const version = ++authVersion;
      const sessionRes = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'Session restore took too long.'
      ).catch(() => ({ data: { session: null } }));
      const u = sessionRes.data.session?.user ?? null;
      console.log('[useAuth] bootstrap user:', u?.id ?? 'none');
      await resolveSession(u, version);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const version = ++authVersion;
      const u = session?.user ?? null;

      // Never await Supabase calls inside onAuthStateChange; it can block sign-in completion.
      window.setTimeout(() => {
        void resolveSession(u, version);
      }, 0);
    });

    const safetyTimeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, selectedRole: AppRole) => {
    const cleanEmail = normalizeEmail(email);
    const { data, error } = await withTimeout(
      supabase.functions.invoke('signup-user', {
        body: { email: cleanEmail, password, fullName, phone, role: selectedRole },
      }),
      12000,
      'Signup took too long. Please try again.'
    );

    if (error) throw new Error(await getFunctionErrorMessage(error, 'Signup failed'));
    if (data?.error) throw new Error(data.error);

    const { data: signInData, error: signInError } = await withTimeout(
      supabase.auth.signInWithPassword({ email: cleanEmail, password }),
      10000,
      'Login took too long. Please try again.'
    );
    if (signInError) throw signInError;
    return signInData;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizeEmail(email), password }),
      8000,
      'Login took too long. Please try again.'
    );
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    // Clear local state immediately so UI doesn't hang waiting for the network
    setUser(null);
    setRole(null);
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (e) {
      console.warn('[useAuth] signOut error', e);
    }
    // Best-effort: nuke any leftover supabase keys in localStorage
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // localStorage cleanup is best-effort only.
    }
    window.location.replace('/auth');
  };

  return { user, role, loading, signUp, signIn, signOut };
}
