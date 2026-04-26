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

export default function Verify() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const { user, signOut } = useAuth();
  const [params] = useSearchParams();

  const queryUserId = params.get("user_id");
  const queryEmail = params.get("email");
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("pending_verification") || "null")
      : null;

  const userId = queryUserId || stored?.user_id || user?.id || null;
  const email = queryEmail || stored?.email || user?.email || "";
  const role = (stored?.role as "store" | "driver" | undefined) || undefined;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const initialSendDone = useRef(false);

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

  const sendCode = async (silent = false) => {
    if (!userId || !email) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", user_id: userId, email },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!silent) toast.success(t.verify.resent);
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      if (!silent) toast.error(e?.message || t.verify.resendError);
    } finally {
      setResending(false);
    }
  };

  // Auto-send once on first mount if not already on cooldown (covers case where signup
  // didn't pre-send or the user reopens the app on the verify page).
  useEffect(() => {
    if (initialSendDone.current) return;
    if (!userId || !email) return;
    initialSendDone.current = true;
    sendCode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, email]);

  const verify = async () => {
    if (!userId || code.length !== 6) {
      return toast.error(t.verify.invalidOtp);
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", user_id: userId, otp: code },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      localStorage.removeItem("pending_verification");
      toast.success(t.verify.success);

      // Resolve role and route
      let resolvedRole: "store" | "driver" | "admin" | null = null;
      for (const candidate of ["admin", "driver", "store"] as const) {
        const { data: hr } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: candidate,
        });
        if (hr) {
          resolvedRole = candidate;
          break;
        }
      }
      if (!resolvedRole && role) resolvedRole = role;

      if (resolvedRole === "admin") return navigate("/admin", { replace: true });
      if (resolvedRole === "store") return navigate("/store", { replace: true });
      if (resolvedRole === "driver") {
        const { data: profile } = await supabase
          .from("driver_profiles")
          .select("onboarding_completed, approval_status")
          .eq("user_id", userId)
          .maybeSingle();
        if (!profile || !profile.onboarding_completed)
          return navigate("/driver/onboarding", { replace: true });
        if (profile.approval_status === "pending" || profile.approval_status === "rejected")
          return navigate("/driver/status", { replace: true });
        return navigate("/driver", { replace: true });
      }
      navigate("/", { replace: true });
    } catch (e: any) {
      const msg = e?.message;
      toast.error(
        msg === "invalid_otp"
          ? t.verify.invalidOtp
          : msg === "otp_expired"
            ? t.verify.otpExpired
            : t.verify.verifyError,
      );
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
                onClick={() => sendCode(false)}
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
