import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import StoreDashboard from "./pages/store/StoreDashboard";
import CreateDelivery from "./pages/store/CreateDelivery";
import TrackDelivery from "./pages/store/TrackDelivery";
import StoreDeliveries from "./pages/store/StoreDeliveries";
import StoreSettings from "./pages/store/StoreSettings";
import StoreSettingsInfo from "./pages/store/StoreSettingsInfo";
import StoreSettingsPayment from "./pages/store/StoreSettingsPayment";
import StoreTerms from "./pages/store/StoreTerms";
import StoreContact from "./pages/store/StoreContact";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverOnboarding from "./pages/driver/DriverOnboarding";
import DriverApprovalStatus from "./pages/driver/DriverApprovalStatus";
import DriverCongrats from "./pages/driver/DriverCongrats";
import DriverPayoutSetup from "./pages/driver/DriverPayoutSetup";
import DriverPayments from "./pages/driver/DriverPayments";
import DriverSettings from "./pages/driver/DriverSettings";
import DriverSettingsInfo from "./pages/driver/DriverSettingsInfo";
import DriverTerms from "./pages/driver/DriverTerms";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ChatRoom from "./pages/ChatRoom";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";
import RequireVerified from "./components/RequireVerified";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem("tawsel_splash_played") !== "true";
    } catch {
      return true;
    }
  });

  const handleSplashFinish = () => {
    try {
      sessionStorage.setItem("tawsel_splash_played", "true");
    } catch {}
    setShowSplash(false);
  };

  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/welcome" element={<Navigate to="/auth" replace />} />
            {/* Store routes */}
            <Route path="/store" element={<RequireVerified><StoreDashboard /></RequireVerified>} />
            <Route path="/store/create" element={<RequireVerified><CreateDelivery /></RequireVerified>} />
            <Route path="/store/track/:id" element={<RequireVerified><TrackDelivery /></RequireVerified>} />
            <Route path="/store/deliveries" element={<RequireVerified><StoreDeliveries /></RequireVerified>} />
            <Route path="/store/settings" element={<RequireVerified><StoreSettings /></RequireVerified>} />
            <Route path="/store/settings/info" element={<RequireVerified><StoreSettingsInfo /></RequireVerified>} />
            <Route path="/store/settings/payment" element={<RequireVerified><StoreSettingsPayment /></RequireVerified>} />
            <Route path="/store/settings/terms" element={<RequireVerified><StoreTerms /></RequireVerified>} />
            <Route path="/store/settings/contact" element={<RequireVerified><StoreContact /></RequireVerified>} />
            {/* Driver routes */}
            <Route path="/driver" element={<RequireVerified><DriverDashboard /></RequireVerified>} />
            <Route path="/driver/onboarding" element={<RequireVerified><DriverOnboarding /></RequireVerified>} />
            <Route path="/driver/status" element={<RequireVerified><DriverApprovalStatus /></RequireVerified>} />
            <Route path="/driver/congrats" element={<RequireVerified><DriverCongrats /></RequireVerified>} />
            <Route path="/driver/payout" element={<RequireVerified><DriverPayoutSetup /></RequireVerified>} />
            <Route path="/driver/payments" element={<RequireVerified><DriverPayments /></RequireVerified>} />
            <Route path="/driver/settings" element={<RequireVerified><DriverSettings /></RequireVerified>} />
            <Route path="/driver/settings/info" element={<RequireVerified><DriverSettingsInfo /></RequireVerified>} />
            <Route path="/driver/settings/terms" element={<RequireVerified><DriverTerms /></RequireVerified>} />
            {/* Messaging */}
            <Route path="/messages" element={<RequireVerified><Messages /></RequireVerified>} />
            <Route path="/messages/:id" element={<RequireVerified><ChatRoom /></RequireVerified>} />
            {/* Notifications */}
            <Route path="/notifications" element={<RequireVerified><Notifications /></RequireVerified>} />
            {/* Admin — same auth page, role-based redirect handles it */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
};

export default App;
