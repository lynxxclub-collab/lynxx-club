import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Browse from "./pages/Browse";
import Dashboard from "./pages/Dashboard";
import CreditHistory from "./pages/CreditHistory";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import VideoDates from "./pages/VideoDates";
import VideoCall from "./pages/VideoCall";
import RateVideoDate from "./pages/RateVideoDate";
import ConfirmSuccessStory from "./pages/ConfirmSuccessStory";
import SuccessStorySurvey from "./pages/SuccessStorySurvey";
import AlumniDashboard from "./components/account/AlumniDashboard";
import Reactivate from "./pages/Reactivate";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Guidelines from "./pages/Guidelines";
import Cookies from "./pages/Cookies";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSuccessStories from "./pages/admin/AdminSuccessStories";
import AdminFraudFlags from "./pages/admin/AdminFraudFlags";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/guidelines" element={<Guidelines />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/help" element={<Help />} />
              <Route path="/safety" element={<Safety />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="success-stories" element={<AdminSuccessStories />} />
                <Route path="fraud-flags" element={<AdminFraudFlags />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
