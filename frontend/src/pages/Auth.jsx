import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlayCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-[#0D0D0D]" data-testid="auth-page">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-mark text-3xl flex items-center justify-center gap-2 mb-8 text-white">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#E63946] text-white"><PlayCircle size={20} strokeWidth={2.5}/></span>
          WeClips
        </Link>

        <div className="border border-[#1A1A1A] bg-[#0D0D0D] rounded-md p-8 fade-up">
          <h1 className="font-display text-3xl font-black tracking-tight text-white uppercase">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-[#8C8C8C] text-sm">
            {mode === "login" ? "Sign in to your WeClips account." : "Free to join — become a member to watch & upload."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="auth-form">
            {mode === "signup" && (
              <div>
                <Label htmlFor="username" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Username</Label>
                <Input
                  id="username" data-testid="signup-username-input"
                  required minLength={2} maxLength={30}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 h-11 bg-[#1A1A1A] border-[#333] text-white"
                  placeholder="creator_handle"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Email</Label>
              <Input
                id="email" type="email" data-testid="auth-email-input"
                required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 bg-[#1A1A1A] border-[#333] text-white"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password" type="password" data-testid="auth-password-input"
                required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 bg-[#1A1A1A] border-[#333] text-white"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-[#E63946]" data-testid="auth-error">{error}</p>}

            <Button type="submit" disabled={busy} data-testid="auth-submit-btn"
                    className="w-full h-11 brand-cta rounded-md font-bold uppercase tracking-wide">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#8C8C8C] text-center">
            {mode === "login" ? "New to WeClips? " : "Already have an account? "}
            <button
              type="button"
              data-testid="toggle-auth-mode"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="font-semibold text-[#E63946] hover:underline"
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
