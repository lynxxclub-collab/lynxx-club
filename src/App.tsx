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
import NotFound from "./pages/NotFound";

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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
