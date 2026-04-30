import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, Store, Bike, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "signup";

export default function Auth() {
  const { t, lang } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const isRTL = lang === "ar";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<"store" | "driver">("store");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const withTimeout = async <T,>(p: PromiseLike<T>, ms: number): Promise<T | null> => {
    let timer: number | undefined;
    try {
      return await Promise.race<T | null>([
        Promise.resolve(p) as Promise<T>,
        new Promise<null>((resolve) => {
          timer = window.setTimeout(() => resolve(null), ms);
        }),
      ]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  const routeAfterAuth = async (userId: string, fallbackRole?: "store" | "driver") => {
    let resolvedRole: "store" | "driver" | "admin" | null = null;

    const roleChecks = await Promise.all(
      (["admin", "driver", "store"] as const).map(async (candidate) => {
        const res = await withTimeout(
          supabase.rpc("has_role", { _user_id: userId, _role: candidate }),
          5000
        );
        return res?.data ? candidate : null;
      }),
    );

    resolvedRole = roleChecks.find(Boolean) ?? null;

    if (!resolvedRole && fallbackRole) resolvedRole = fallbackRole;

    if (resolvedRole === "admin") return navigate("/admin", { replace: true });
    if (resolvedRole === "store") return navigate("/store", { replace: true });

    if (resolvedRole === "driver") {
      const res = await withTimeout(
        supabase
          .from("driver_profiles")
          .select("onboarding_completed, approval_status")
          .eq("user_id", userId)
          .maybeSingle(),
        5000
      );
      const profile = res?.data;

      if (!profile || !profile.onboarding_completed) {
        return navigate("/driver/onboarding", { replace: true });
      }

      if (profile.approval_status === "pending" || profile.approval_status === "rejected") {
        return navigate("/driver/status", { replace: true });
      }

      return navigate("/driver", { replace: true });
    }

    navigate("/", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      if (mode === "login") {
        const data = await signIn(email.trim(), password);
        const userId = data.user?.id;

        if (!userId) throw new Error("Login failed");

        toast.success("Welcome back!");
        await routeAfterAuth(userId);
      } else {
        if (!fullName.trim()) throw new Error("Please enter your full name");
        if (!phone.trim()) throw new Error("Please enter your phone number");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");

        try {
          const data = await signUp(email.trim(), password, fullName.trim(), phone.trim(), selectedRole);

          const userId = data.user?.id;

          if (!userId) throw new Error("Signup failed — please try again.");

          // Persist verification context so a refresh / app-close keeps the gate in place
          localStorage.setItem(
            "pending_verification",
            JSON.stringify({ user_id: userId, email: email.trim().toLowerCase(), role: selectedRole }),
          );

          toast.success("Account created! Check your email for a verification code.");

          navigate(`/verify?user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true });
        } catch (signupErr: any) {
          const msg = (signupErr?.message || "").toLowerCase();

          if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already") || msg.includes("user_already_exists")) {
            toast.error("This email is already registered. If you forgot the password, use password reset.");
            setMode("login");
            return;
          }

          throw signupErr;
        }
      }
    } catch (err: any) {
      let msg = err?.message || "Something went wrong. Please try again.";
      const normalized = String(msg).toLowerCase();
      if (normalized.includes("invalid login credentials")) {
        msg = "Wrong email or password. If this account was removed, please sign up again.";
      } else if (normalized.includes("failed to send a request") || normalized.includes("edge function returned a non-2xx")) {
        msg = "Could not reach the account service. Please try again in a moment.";
      } else if (normalized.includes("user_already_exists")) {
        msg = "This email is already registered. Please sign in or reset your password.";
      }
      toast.error(msg);
      console.error("[Auth] error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-[100dvh] bg-background flex flex-col", isRTL && "rtl")} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-4 pt-20">
        <LanguageToggle />
        <h1 className="text-lg font-bold text-foreground font-['Inter']">{t.app.name}</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{mode === "login" ? t.auth.login : t.auth.signup}</h2>
          </div>

          <div className="flex rounded-xl bg-secondary p-1 gap-1">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "login" ? t.auth.login : t.auth.signup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      {t.auth.fullName}
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      className="h-12 rounded-xl bg-secondary border-0 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      {t.auth.phone}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-12 rounded-xl bg-secondary border-0 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.auth.selectRole}</Label>

                    <div className="flex gap-3">
                      {[
                        { value: "store" as const, label: t.auth.store, icon: Store },
                        { value: "driver" as const, label: t.auth.driver, icon: Bike },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedRole(value)}
                          className={cn(
                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            selectedRole === value
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-secondary text-muted-foreground hover:border-accent/50",
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-semibold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                className="h-12 rounded-xl bg-secondary border-0 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-12 rounded-xl bg-secondary border-0 text-base pe-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-accent font-semibold mt-1"
                >
                  {t.auth.forgotPassword}
                </button>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? t.auth.login : t.auth.signup}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-accent font-semibold"
            >
              {mode === "login" ? t.auth.signup : t.auth.login}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
