import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, username);
      }
      const redirect = location.state?.from || "/";
      navigate(redirect);
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white" data-testid="auth-page">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-mark text-4xl flex items-center justify-center gap-2 mb-8 text-[#0F172A]">
          WeClips
        </Link>

        <div className="border border-[#E2E8F0] bg-white rounded-lg p-8 fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-[#64748B] text-sm">
            {mode === "login" ? "Sign in to your WeClips account." : "Free to join — become a member to watch & upload."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="auth-form">
            {mode === "signup" && (
              <div>
                <Label htmlFor="username" className="text-[#475569] text-xs uppercase tracking-wider">Username</Label>
                <Input
                  id="username" data-testid="signup-username-input"
                  required minLength={2} maxLength={30}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                  placeholder="creator_handle"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-[#475569] text-xs uppercase tracking-wider">Email</Label>
              <Input
                id="email" type="email" data-testid="auth-email-input"
                required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[#475569] text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password" type="password" data-testid="auth-password-input"
                required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-[#DC2626]" data-testid="auth-error">{error}</p>}

            <Button type="submit" disabled={busy} data-testid="auth-submit-btn"
                    className="w-full h-11 brand-cta rounded-md font-bold">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#64748B] text-center">
            {mode === "login" ? "New to WeClips? " : "Already have an account? "}
            <button
              type="button"
              data-testid="toggle-auth-mode"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="font-semibold text-[#2B8FCA] hover:underline"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
