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

const getFunctionErrorMessage = async (error: any, fallback: string) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {}
  return error?.message || fallback;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const resolveLoading = () => {
      if (!mounted || resolved) return;
      resolved = true;
      setLoading(false);
    };

    const fetchRole = async (userId: string): Promise<AppRole | null> => {
      try {
        // Use the SECURITY DEFINER RPC so role checks do not depend on client-side RLS reads.
        for (const candidate of ['admin', 'driver', 'store'] as const) {
          const { data } = await supabase.rpc('has_role', {
            _user_id: userId,
            _role: candidate,
          });
          if (data) return candidate;
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

    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const u = session?.user ?? null;
        console.log('[useAuth] bootstrap user:', u?.id ?? 'none');
        setUser(u);
        if (u) {
          const userRole = await fetchRole(u.id);
          console.log('[useAuth] resolved role:', userRole);
          if (mounted) setRole(userRole);
        } else {
          setRole(null);
        }
      } finally {
        resolveLoading();
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const userRole = await fetchRole(u.id);
          if (mounted) setRole(userRole);
        } else {
          setRole(null);
        }
      } finally {
        resolveLoading();
      }
    });

    const safetyTimeout = window.setTimeout(resolveLoading, 3000);

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, selectedRole: AppRole) => {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('signup-user', {
        body: { email, password, fullName, phone, role: selectedRole },
      }),
      12000,
      'Signup took too long. Please try again.'
    );

    if (error) throw new Error(await getFunctionErrorMessage(error, 'Signup failed'));
    if (data?.error) throw new Error(data.error);

    const { data: signInData, error: signInError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      10000,
      'Login took too long. Please try again.'
    );
    if (signInError) throw signInError;
    return signInData;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      10000,
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
    } catch {}
    window.location.replace('/auth');
  };

  return { user, role, loading, signUp, signIn, signOut };
}
