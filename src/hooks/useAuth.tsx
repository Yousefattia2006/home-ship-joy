import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'store' | 'driver' | 'admin';

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
        const roleChecks: AppRole[] = ['admin', 'driver', 'store'];

        for (const candidate of roleChecks) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: userId,
            _role: candidate,
          });

          if (!error && data) {
            return candidate;
          }
        }

        const { data: storeProfile, error: storeError } = await supabase
          .from('store_profiles')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!storeError && storeProfile) {
          return 'store';
        }

        const { data: driverProfile, error: driverError } = await supabase
          .from('driver_profiles')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!driverError && driverProfile) {
          return 'driver';
        }

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: selectedRole });

      if (selectedRole === 'store') {
        await supabase.from('store_profiles').insert({ user_id: data.user.id, store_name: fullName, phone });
      } else if (selectedRole === 'driver') {
        await supabase.from('driver_profiles').insert({ user_id: data.user.id, full_name: fullName, phone });
      }
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return { user, role, loading, signUp, signIn, signOut };
}
