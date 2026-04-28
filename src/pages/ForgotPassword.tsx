import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

type Step = "email" | "code" | "password";

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isRTL = lang === "ar";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) return toast.error("Enter your email");
    setLoading(true);
    try {
      // Look up user id via the same RPC the signup uses (service-role only).
      // Frontend can't call it directly, so we hit a tiny edge action: send-otp will fail if user doesn't exist.
      // Instead, ask send-otp to look up by email itself (we extend it below by passing email-only).
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", {
          body: { action: "send_by_email", email: email.trim().toLowerCase() },
        }),
        12000,
        "Sending the code took too long. Please try again."
      );
      if (error) throw new Error(await getFunctionErrorMessage(error, "Failed to send code"));
      if (data?.error) throw new Error(data.error);
      setUserId(data.user_id);
      toast.success("Verification code sent to your email");
      setStep("code");
    } catch (e: any) {
      toast.error(e?.message === "no_account" ? "No account with that email" : (e?.message || "Failed to send code"));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!userId || code.length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", {
          body: { action: "verify", user_id: userId, otp: code },
        }),
        10000,
        "Verification took too long. Please try again."
      );
      if (error) throw new Error(await getFunctionErrorMessage(error, "Verification failed"));
      if (data?.error) throw new Error(data.error);
      toast.success("Code verified. Choose a new password.");
      setStep("password");
    } catch (e: any) {
      const msg = e?.message;
      toast.error(msg === "invalid_otp" ? "Invalid code" : msg === "otp_expired" ? "Code expired" : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("reset-password", {
          body: { email: email.trim().toLowerCase(), new_password: newPassword },
        }),
        12000,
        "Password reset took too long. Please try again."
      );
      if (error) throw new Error(await getFunctionErrorMessage(error, "Failed to reset password"));
      if (data?.error) throw new Error(data.error);
      toast.success("Password updated. Please log in.");
      navigate("/auth", { replace: true });
    } catch (e: any) {
      const msg = e?.message;
      toast.error(msg === "otp_required" ? "Please verify the code again before updating your password" : (msg || "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-[100dvh] bg-background flex flex-col px-6 py-8", isRTL && "rtl")} dir={isRTL ? "rtl" : "ltr"}>
      <button onClick={() => navigate("/auth")} className="flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "code" && `We sent a 6-digit code to ${email}`}
            {step === "password" && "Choose a new password"}
          </p>
        </div>

        {step === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-secondary border-0" />
            </div>
            <Button onClick={sendCode} disabled={loading} className="w-full h-12 rounded-xl font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send code"}
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification code</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 rounded-xl bg-secondary border-0 text-center tracking-widest text-lg"
              />
            </div>
            <Button onClick={verifyCode} disabled={loading} className="w-full h-12 rounded-xl font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
            </Button>
            <button type="button" onClick={sendCode} className="text-sm text-accent w-full text-center">
              Resend code
            </button>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="h-12 rounded-xl bg-secondary border-0 pe-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Toggle password"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button onClick={resetPassword} disabled={loading} className="w-full h-12 rounded-xl font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update password"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
