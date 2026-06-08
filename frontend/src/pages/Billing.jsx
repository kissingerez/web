import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Crown, Check, Lock } from "lucide-react";

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

  if (authLoading) return <p className="text-[#8C8C8C]">Loading…</p>;

  return (
    <div data-testid="billing-page" className="max-w-2xl mx-auto py-8">
      <div className="text-center fade-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-[#4D1317] text-[#FFD9DB] mb-4">
          <Crown size={28}/>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tight text-white uppercase">Become a Member</h1>
        <p className="mt-3 text-[#B3B3B3] text-base max-w-md mx-auto">
          One simple membership. Ad-free always. Cancel anytime.
        </p>
      </div>

      <div className="mt-10 border border-[#1A1A1A] bg-[#0D0D0D] rounded-md p-8 fade-up">
        <div className="flex items-baseline gap-2 text-white">
          <span className="font-display text-6xl font-black tracking-tight">$0.99</span>
          <span className="text-[#8C8C8C]">/ month</span>
        </div>
        <ul className="mt-6 space-y-3 text-[#B3B3B3]">
          <li className="flex items-start gap-3"><Check className="text-[#2A9D8F] mt-0.5" size={18}/> Watch every clip — ad-free</li>
          <li className="flex items-start gap-3"><Check className="text-[#2A9D8F] mt-0.5" size={18}/> Upload your own videos (up to 2 GB)</li>
          <li className="flex items-start gap-3"><Check className="text-[#2A9D8F] mt-0.5" size={18}/> Follow your favorite creators</li>
          <li className="flex items-start gap-3"><Check className="text-[#2A9D8F] mt-0.5" size={18}/> No AI-generated junk — human clips only</li>
          <li className="flex items-start gap-3"><Check className="text-[#2A9D8F] mt-0.5" size={18}/> Cancel anytime</li>
        </ul>

        {user?.is_premium ? (
          <div className="mt-8 p-4 rounded-md bg-[#1A1A1A] border border-[#2A9D8F] text-[#F2F2F2] text-sm" data-testid="billing-active">
            You're an active Member.{user.premium_until && (
              <> Renews / expires on <b>{new Date(user.premium_until).toLocaleDateString()}</b>.</>
            )}
          </div>
        ) : (
          <Button
            onClick={subscribe}
            disabled={busy}
            data-testid="billing-subscribe-btn"
            className="mt-8 w-full h-12 brand-cta rounded-md font-bold text-base uppercase tracking-wide"
          >
            {busy ? "Redirecting…" : "Become a Member · $0.99"}
          </Button>
        )}

        {error && <p className="mt-4 text-sm text-[#E63946]" data-testid="billing-error">{error}</p>}

        {!user && (
          <p className="mt-4 text-sm text-[#8C8C8C] text-center">
            <Link to="/auth" className="text-[#E63946] underline">Log in</Link> or create an account first.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-[#666] text-center flex items-center justify-center gap-1.5">
        <Lock size={12}/> Secure payment via Stripe
      </p>
    </div>
  );
};

export default Billing;
