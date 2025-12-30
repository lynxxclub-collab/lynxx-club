import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionTimeoutProvider } from "@/contexts/SessionTimeoutProvider";

// Critical routes loaded eagerly
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical routes for code splitting
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Browse = lazy(() => import("./pages/Browse"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreditHistory = lazy(() => import("./pages/CreditHistory"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/Settings"));
const VideoDates = lazy(() => import("./pages/VideoDates"));
const VideoCall = lazy(() => import("./pages/VideoCall"));
const RateVideoDate = lazy(() => import("./pages/RateVideoDate"));
const ConfirmSuccessStory = lazy(() => import("./pages/ConfirmSuccessStory"));
const SuccessStorySurvey = lazy(() => import("./pages/SuccessStorySurvey"));
const AlumniDashboard = lazy(() => import("./components/account/AlumniDashboard"));
const Reactivate = lazy(() => import("./pages/Reactivate"));
const Terms = lazy(() => import("./pages/Terms"));
const PricingFAQPage = lazy(() => import("./pages/PricingFAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Guidelines = lazy(() => import("./pages/Guidelines"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Help = lazy(() => import("./pages/Help"));
const Safety = lazy(() => import("./pages/Safety"));
const Report = lazy(() => import("./pages/Report"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Careers = lazy(() => import("./pages/Careers"));
const Launch = lazy(() => import("./pages/Launch"));
const Verify = lazy(() => import("./pages/Verify"));
const Profile = lazy(() => import("./pages/Profile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Saved = lazy(() => import("./pages/Saved"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EarningsAnalytics = lazy(() => import("./pages/EarningsAnalytics"));
const PayoutHistory = lazy(() => import("./pages/PayoutHistory"));
const CreatorGiftingOnboarding = lazy(() => import("./pages/CreatorGiftingOnboarding"));
const ApplicationStatus = lazy(() => import("./pages/ApplicationStatus"));

// Admin routes - lazy loaded as a group
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSuccessStories = lazy(() => import("./pages/admin/AdminSuccessStories"));
const AdminFraudFlags = lazy(() => import("./pages/admin/AdminFraudFlags"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminCreatorApplications = lazy(() => import("./pages/admin/AdminCreatorApplications"));

const queryClient = new QueryClient();

// Minimal loading fallback for suspense
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <SessionTimeoutProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/credits" element={<CreditHistory />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/video-dates" element={<VideoDates />} />
                  <Route path="/video-call/:videoDateId" element={<VideoCall />} />
                  <Route path="/rate/:videoDateId" element={<RateVideoDate />} />
                  <Route path="/success-story/confirm/:storyId" element={<ConfirmSuccessStory />} />
                  <Route path="/success-story/survey/:storyId" element={<SuccessStorySurvey />} />
                  <Route path="/alumni" element={<AlumniDashboard />} />
                  <Route path="/reactivate" element={<Reactivate />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/faq/pricing" element={<PricingFAQPage />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/guidelines" element={<Guidelines />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/report" element={<Report />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/launch" element={<Launch />} />
                  <Route path="/verify" element={<Verify />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/credits/success" element={<PaymentSuccess />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/earnings-analytics" element={<EarningsAnalytics />} />
                  <Route path="/payout-history" element={<PayoutHistory />} />
                  <Route path="/creator-gifting-onboarding" element={<CreatorGiftingOnboarding />} />
                  <Route path="/application-status" element={<ApplicationStatus />} />
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="applications" element={<AdminCreatorApplications />} />
                    <Route path="verifications" element={<AdminVerifications />} />
                    <Route path="success-stories" element={<AdminSuccessStories />} />
                    <Route path="fraud-flags" element={<AdminFraudFlags />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                    <Route path="payouts" element={<AdminPayouts />} />
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SessionTimeoutProvider>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;