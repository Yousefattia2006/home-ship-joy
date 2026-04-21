import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
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
import AdminDashboard from "./pages/admin/AdminDashboard";
import ChatRoom from "./pages/ChatRoom";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import VerifyOTP from "./pages/VerifyOTP";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify" element={<VerifyOTP />} />
            <Route path="/welcome" element={<Navigate to="/auth" replace />} />
            {/* Store routes */}
            <Route path="/store" element={<StoreDashboard />} />
            <Route path="/store/create" element={<CreateDelivery />} />
            <Route path="/store/track/:id" element={<TrackDelivery />} />
            <Route path="/store/deliveries" element={<StoreDeliveries />} />
            <Route path="/store/settings" element={<StoreSettings />} />
            <Route path="/store/settings/info" element={<StoreSettingsInfo />} />
            <Route path="/store/settings/payment" element={<StoreSettingsPayment />} />
            <Route path="/store/settings/terms" element={<StoreTerms />} />
            <Route path="/store/settings/contact" element={<StoreContact />} />
            {/* Driver routes */}
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/driver/onboarding" element={<DriverOnboarding />} />
            <Route path="/driver/status" element={<DriverApprovalStatus />} />
            <Route path="/driver/congrats" element={<DriverCongrats />} />
            <Route path="/driver/payout" element={<DriverPayoutSetup />} />
            <Route path="/driver/payments" element={<DriverPayments />} />
            <Route path="/driver/settings" element={<DriverSettings />} />
            <Route path="/driver/settings/info" element={<DriverSettingsInfo />} />
            <Route path="/driver/settings/terms" element={<DriverTerms />} />
            {/* Messaging */}
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<ChatRoom />} />
            {/* Notifications */}
            <Route path="/notifications" element={<Notifications />} />
            {/* Admin — same auth page, role-based redirect handles it */}
            <Route path="/admin/login" element={<Navigate to="/auth" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
