import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN = 45;

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
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
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

const otpErrorText = (msg?: string) => {
  if (msg === "invalid_otp" || msg === "no_otp_found") return "Wrong code. Please check the latest OTP email and try again.";
  if (msg === "otp_expired") return "This code expired. Please resend a new code.";
  if (msg === "too_many_attempts") return "Too many wrong attempts. Please resend a new code.";
  return "Could not verify the code. Please try again.";
};

export default function Verify() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const { user, signOut } = useAuth();
  const [params] = useSearchParams();

  const queryUserId = params.get("user_id");
  const queryEmail = params.get("email");
  const stored = (() => {
    try {
      return typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("pending_verification") || "null")
        : null;
    } catch {
      return null;
    }
  })();

  const userId = queryUserId || stored?.user_id || user?.id || null;
  const email = queryEmail || stored?.email || user?.email || "";
  const role = (stored?.role as "store" | "driver" | undefined) || undefined;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (!userId || !email) {
      navigate("/auth", { replace: true });
    }
  }, [userId, email, navigate]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Persist context so refresh / app close still gates the user
  useEffect(() => {
    if (userId && email) {
      localStorage.setItem(
        "pending_verification",
        JSON.stringify({ user_id: userId, email, role }),
      );
    }
  }, [userId, email, role]);

  const sendCode = async () => {
    if (!userId || !email) return;
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", {
          body: { action: "send", user_id: userId, email },
        }),
        12000,
        "Sending the code took too long. Please try again."
      );
      if (error) throw new Error(await getFunctionErrorMessage(error, t.verify.resendError));
      if (data?.error) throw new Error(data.error);
      toast.success(t.verify.resent);
      setCooldown(RESEND_COOLDOWN);
      setCode("");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || t.verify.resendError);
    } finally {
      setResending(false);
    }
  };

  const verify = async () => {
    if (!userId || code.length !== 6) {
      return toast.error(t.verify.invalidOtp);
    }
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", {
          body: { action: "verify", user_id: userId, otp: code },
        }),
        10000,
        "Verification took too long. Please try again."
      );
      if (error) throw new Error(await getFunctionErrorMessage(error, t.verify.verifyError));
      if (data?.error) throw new Error(data.error);

      localStorage.removeItem("pending_verification");
      toast.success(t.verify.success);

      // Use stored role for instant routing; the dashboards will hydrate the rest.
      const resolvedRole: "store" | "driver" | null = role ?? null;

      if (resolvedRole === "store") return navigate("/store", { replace: true });
      if (resolvedRole === "driver") return navigate("/driver/onboarding", { replace: true });

      // Fallback: try one quick role lookup, otherwise go home
      const checks = await Promise.all(
        (["admin", "driver", "store"] as const).map(async (candidate) => {
          const res = await withTimeout(
            supabase.rpc("has_role", { _user_id: userId, _role: candidate }),
            2500,
            "Role check timed out."
          ).catch(() => null);
          return res?.data ? candidate : null;
        })
      );
      const fallback = checks.find(Boolean) ?? null;
      if (fallback === "admin") return navigate("/admin", { replace: true });
      if (fallback === "store") return navigate("/store", { replace: true });
      if (fallback === "driver") return navigate("/driver/onboarding", { replace: true });
      navigate("/", { replace: true });
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      toast.error(otpErrorText(msg));
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    localStorage.removeItem("pending_verification");
    await signOut();
  };

  return (
    <div
      className={cn("min-h-[100dvh] bg-background flex flex-col px-6 py-8", isRTL && "rtl")}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <button onClick={cancel} className="flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">{t.common.back}</span>
      </button>

      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t.verify.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.verify.subtitle}
            {email && <span className="block mt-1 font-medium text-foreground">{email}</span>}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.verify.title}</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="h-14 rounded-xl bg-secondary border-0 text-center tracking-[0.5em] text-2xl font-bold"
              autoFocus
            />
          </div>

          <Button
            onClick={verify}
            disabled={loading || code.length !== 6}
            className="w-full h-12 rounded-xl font-bold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.verify.verifyButton}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {t.verify.didntReceive}{" "}
            {cooldown > 0 ? (
              <span className="text-muted-foreground">
                {t.verify.resendIn} {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={resending}
                className="text-accent font-semibold"
              >
                {t.verify.resendButton}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
