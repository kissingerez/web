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
        <Link to="/" className="block mb-3" data-testid="auth-brand-link">
          <img
            src="/weclips-banner-1280.png"
            alt="WeClips — Ad-free, Christian, and calm"
            className="mx-auto w-full max-w-[320px] h-auto"
          />
        </Link>

        <div className="border border-[#E2E8F0] bg-white rounded-lg p-8 fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            {mode === "login" ? "Sign in" : "Create an account"}
          </h1>

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
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[#475569] text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password" type="password" data-testid="auth-password-input"
                required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]"
              />
            </div>

            {error && <p className="text-sm text-[#DC2626]" data-testid="auth-error">{error}</p>}

            <Button type="submit" disabled={busy} data-testid="auth-submit-btn"
                    className="w-full h-11 brand-cta rounded-md font-bold">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>

            {mode === "login" && (
              <Link to="/forgot" data-testid="auth-forgot-link"
                    className="block text-center text-sm text-[#89CFF0] font-semibold hover:underline">
                Reset password
              </Link>
            )}
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
