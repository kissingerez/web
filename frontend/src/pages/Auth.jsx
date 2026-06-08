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
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white" data-testid="auth-page">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-mark text-2xl flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#ff3b30] text-white"><PlayCircle size={20}/></span>
          slate
        </Link>

        <div className="border border-slate-200 rounded-2xl p-8 fade-up">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            {mode === "login" ? "Sign in to your slate account." : "Free to join — subscribe later to watch & upload."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="auth-form">
            {mode === "signup" && (
              <div>
                <Label htmlFor="username" className="text-slate-700">Username</Label>
                <Input
                  id="username" data-testid="signup-username-input"
                  required minLength={2} maxLength={30}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 h-11"
                  placeholder="creator_handle"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email" type="email" data-testid="auth-email-input"
                required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password" type="password" data-testid="auth-password-input"
                required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600" data-testid="auth-error">{error}</p>}

            <Button type="submit" disabled={busy} data-testid="auth-submit-btn"
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold">
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            {mode === "login" ? "New to slate? " : "Already have an account? "}
            <button
              type="button"
              data-testid="toggle-auth-mode"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="font-semibold text-[#ff3b30] hover:underline"
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
