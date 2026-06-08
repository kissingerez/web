import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Lock } from "lucide-react";

const Billing = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const subscribe = async () => {
    if (!user) { navigate("/auth", { state: { from: "/billing" } }); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.post("/payments/checkout", { origin_url: window.location.origin });
      window.location.href = res.data.url;
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to start checkout");
      setBusy(false);
    }
  };

  if (authLoading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div data-testid="billing-page" className="max-w-2xl mx-auto py-8">
      <div className="text-center fade-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <Sparkles size={28}/>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">Go Premium</h1>
        <p className="mt-3 text-slate-500 text-lg max-w-md mx-auto">
          One simple membership. Ad-free always. Cancel anytime.
        </p>
      </div>

      <div className="mt-10 border border-slate-200 rounded-2xl p-8 fade-up">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tighter">$0.99</span>
          <span className="text-slate-500">/ month</span>
        </div>
        <ul className="mt-6 space-y-3 text-slate-700">
          <li className="flex items-start gap-3"><Check className="text-emerald-600 mt-0.5" size={18}/> Watch every video — ad-free</li>
          <li className="flex items-start gap-3"><Check className="text-emerald-600 mt-0.5" size={18}/> Upload your own videos (up to 100 MB)</li>
          <li className="flex items-start gap-3"><Check className="text-emerald-600 mt-0.5" size={18}/> Follow your favorite creators</li>
          <li className="flex items-start gap-3"><Check className="text-emerald-600 mt-0.5" size={18}/> Cancel anytime</li>
        </ul>

        {user?.is_premium ? (
          <div className="mt-8 p-4 rounded-lg bg-emerald-50 text-emerald-800 text-sm" data-testid="billing-active">
            You are a Premium member.{user.premium_until && (
              <> Renews / expires on <b>{new Date(user.premium_until).toLocaleDateString()}</b>.</>
            )}
          </div>
        ) : (
          <Button
            onClick={subscribe}
            disabled={busy}
            data-testid="billing-subscribe-btn"
            className="mt-8 w-full h-12 gold-shimmer text-white rounded-lg font-bold text-base"
          >
            {busy ? "Redirecting…" : "Subscribe for $0.99"}
          </Button>
        )}

        {error && <p className="mt-4 text-sm text-red-600" data-testid="billing-error">{error}</p>}

        {!user && (
          <p className="mt-4 text-sm text-slate-500 text-center">
            <Link to="/auth" className="text-[#ff3b30] underline">Log in</Link> or create an account to subscribe.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
        <Lock size={12}/> Secure payment via Stripe
      </p>
    </div>
  );
};

export default Billing;
