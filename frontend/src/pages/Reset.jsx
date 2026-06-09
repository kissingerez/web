import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Reset = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!token) return setError("Missing reset token. Open the link from your email again.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err) {
      setError(err?.response?.data?.detail || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white" data-testid="reset-page">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-mark text-5xl flex items-center justify-center gap-2 mb-2 text-[#89CFF0]">
          WeClips
        </Link>
        <p className="text-center text-[#475569] text-sm mb-8">
          Ad-free Christian-friendly video, $1/month. No AI. No chaos.
        </p>

        <div className="border border-[#E2E8F0] bg-white rounded-lg p-8 fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">Choose a new password</h1>

          {done ? (
            <div className="mt-4 p-4 rounded-md bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-sm font-semibold" data-testid="reset-success">
              Password updated. Redirecting to sign in…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pw" className="text-[#475569] text-xs uppercase tracking-wider">New password (min 6 chars)</Label>
                <Input
                  id="pw" type="password" data-testid="reset-password-input"
                  required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                />
              </div>
              <div>
                <Label htmlFor="pw2" className="text-[#475569] text-xs uppercase tracking-wider">Confirm new password</Label>
                <Input
                  id="pw2" type="password" data-testid="reset-confirm-input"
                  required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                />
              </div>
              {error && <p className="text-sm text-[#DC2626]" data-testid="reset-error">{error}</p>}
              <Button type="submit" disabled={busy} data-testid="reset-submit-btn"
                      className="w-full h-11 brand-cta rounded-md font-bold">
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}

          <Link to="/auth" data-testid="reset-back-login" className="block text-center mt-6 text-[#89CFF0] font-bold hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Reset;
