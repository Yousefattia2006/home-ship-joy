import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Blocks access to a route until the current user has a verified email OTP.
 * Routes the user to /verify if they're signed in but unverified.
 * Routes to /auth if not signed in at all.
 */
export default function RequireVerified({ children }: Props) {
  const { user, role, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user) {
      setChecking(false);
      setVerified(null);
      return;
    }

    // Admins bypass the email-OTP verification gate (they're provisioned server-side).
    if (role === 'admin') {
      setVerified(true);
      setChecking(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await Promise.race([
          supabase.functions.invoke("send-otp", {
            body: { action: "check", user_id: user.id },
          }),
          new Promise<{ data: null; error: Error }>((resolve) =>
            window.setTimeout(() => resolve({ data: null, error: new Error("verification_check_timeout") }), 5000),
          ),
        ]);
        if (!alive) return;
        if (error) {
          // Be safe: treat as unverified
          setVerified(false);
        } else {
          setVerified(!!data?.is_verified);
        }
      } catch {
        if (alive) setVerified(false);
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, role, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!verified) {
    // Persist context for the verify screen
    try {
      const existing = JSON.parse(localStorage.getItem("pending_verification") || "null");
      if (!existing || existing.user_id !== user.id) {
        localStorage.setItem(
          "pending_verification",
          JSON.stringify({ user_id: user.id, email: user.email }),
        );
      }
    } catch {}
    return <Navigate to="/verify" replace />;
  }

  return <>{children}</>;
}
