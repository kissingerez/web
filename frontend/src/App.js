import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Discover from "@/pages/Discover";
import Following from "@/pages/Following";
import Upload from "@/pages/Upload";
import Watch from "@/pages/Watch";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import Billing from "@/pages/Billing";
import Forgot from "@/pages/Forgot";
import Reset from "@/pages/Reset";
import Search from "@/pages/Search";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import Admin from "@/pages/Admin";
import { BillingSuccess, BillingCancel } from "@/pages/BillingResult";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/billing/success" element={<Layout><BillingSuccess /></Layout>} />
          <Route path="/billing/cancel" element={<Layout><BillingCancel /></Layout>} />
          <Route path="/" element={<Layout><Discover /></Layout>} />
          <Route path="/search" element={<Layout><Search /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/following" element={<Layout><Following /></Layout>} />
          <Route path="/upload" element={<Layout><Upload /></Layout>} />
          <Route path="/watch/:id" element={<Layout><Watch /></Layout>} />
          <Route path="/u/:username" element={<Layout><Profile /></Layout>} />
          <Route path="/p/:userId" element={<Layout><Profile /></Layout>} />
          <Route path="/billing" element={<Layout><Billing /></Layout>} />
          <Route path="*" element={<Layout><Discover /></Layout>} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
