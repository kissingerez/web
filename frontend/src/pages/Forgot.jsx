import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Forgot = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Please enter your email.");
    setBusy(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      if (res.data?.dev_reset_url) setDevUrl(res.data.dev_reset_url);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  const openDevLink = () => {
    if (!devUrl) return;
    const m = devUrl.match(/[?&]token=([^&]+)/);
    if (m) window.location.assign(`/reset?token=${m[1]}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white" data-testid="forgot-page">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-mark text-5xl flex items-center justify-center gap-2 mb-2 text-[#89CFF0]">
          WeClips
        </Link>
        <p className="text-center text-[#475569] text-sm mb-8">
          Ad-free Christian-friendly video, $1/month. No AI. No chaos.
        </p>

        <div className="border border-[#E2E8F0] bg-white rounded-lg p-8 fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">Reset your password</h1>

          {!sent ? (
            <>
              <p className="mt-2 text-[#64748B] text-sm">
                Enter the email you signed up with. We'll send a link to reset your password.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email" className="text-[#475569] text-xs uppercase tracking-wider">Email</Label>
                  <Input
                    id="email" type="email" data-testid="forgot-email-input"
                    required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                  />
                </div>
                {error && <p className="text-sm text-[#DC2626]" data-testid="forgot-error">{error}</p>}
                <Button type="submit" disabled={busy} data-testid="forgot-submit-btn"
                        className="w-full h-11 brand-cta rounded-md font-bold">
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mt-4 p-4 rounded-md bg-[#DCEEFB] text-[#0A1929] text-sm" data-testid="forgot-success">
                If that email is registered, we just sent a reset link. It's valid for 15 minutes.
              </div>

              {devUrl && (
                <div className="mt-4 p-4 rounded-md bg-[#F1F5F9] border border-[#E2E8F0]">
                  <p className="text-[11px] font-extrabold tracking-widest text-[#D97706] mb-1">PREVIEW / DEV MODE</p>
                  <p className="text-sm text-[#475569] mb-3 leading-relaxed">
                    Email service isn't configured yet. Click below to open the reset page directly:
                  </p>
                  <Button
                    onClick={openDevLink}
                    data-testid="forgot-dev-link-btn"
                    className="w-full brand-cta h-10 rounded-md font-bold"
                  >
                    Open reset page
                  </Button>
                </div>
              )}
            </>
          )}

          <Link to="/auth" data-testid="forgot-back-login" className="block text-center mt-6 text-[#89CFF0] font-bold hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
