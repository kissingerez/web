import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";

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

  if (authLoading) return <p className="text-[#64748B]">Loading…</p>;

  return (
    <div data-testid="billing-page" className="max-w-md mx-auto py-12">
      <div className="border border-[#E2E8F0] bg-white rounded-lg p-8 fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]" data-testid="billing-heading">Membership</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          <b className="text-[#0F172A]">$0.99/mo</b> · 7 days free · cancel anytime
        </p>

        <ul className="mt-6 space-y-2.5 text-sm text-[#475569]">
          <li className="flex items-start gap-2.5"><Check className="text-[#0E9F6E] mt-0.5 shrink-0" size={16}/> Watch every clip — ad-free</li>
          <li className="flex items-start gap-2.5"><Check className="text-[#0E9F6E] mt-0.5 shrink-0" size={16}/> Upload your own (up to 25 GB)</li>
          <li className="flex items-start gap-2.5"><Check className="text-[#0E9F6E] mt-0.5 shrink-0" size={16}/> Follow creators you love</li>
          <li className="flex items-start gap-2.5"><Check className="text-[#0E9F6E] mt-0.5 shrink-0" size={16}/> No AI-generated junk</li>
        </ul>

        {user?.is_premium ? (
          <div className="mt-6 p-3 rounded-md bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-sm" data-testid="billing-active">
            You&apos;re an active Member.{user.premium_until && (
              <> Renews <b>{new Date(user.premium_until).toLocaleDateString()}</b>.</>
            )}
          </div>
        ) : (
          <Button
            onClick={subscribe}
            disabled={busy}
            data-testid="billing-subscribe-btn"
            className="mt-6 w-full h-11 brand-cta rounded-md font-bold"
          >
            {busy ? "Redirecting…" : "Start free trial"}
          </Button>
        )}

        {error && <p className="mt-3 text-sm text-[#DC2626]" data-testid="billing-error">{error}</p>}
        {!user && (
          <p className="mt-3 text-xs text-[#64748B] text-center">
            <Link to="/auth" className="text-[#2B8FCA] underline">Log in</Link> to start your trial.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-[#94A3B8] text-center flex items-center justify-center gap-1.5">
        <Lock size={11}/> Secure payment via Stripe
      </p>

      <section className="mt-10 border border-[#E2E8F0] bg-white rounded-lg p-6" data-testid="founder-note">
        <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold">Why I made WeClips</p>
        <p className="mt-3 text-sm leading-relaxed text-[#475569]">
          I, like many people, missed the days of old when online streaming was ad-free and either educational or entertainment. Nowadays online content is unwatchable due to the spamming of ads, sponsorships, pop-ups, and videos that try to manipulate, fear-monger, or destroy people&apos;s minds with excess visual and sound effects.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#475569]">
          My goal for WeClips is to provide a more healthy way to stream your favorite videos — without the heavy toll modern streaming takes on you.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <img
            src="/founder-nixon.jpg"
            alt="Nixon — founder of WeClips"
            className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
            data-testid="founder-avatar"
          />
          <div>
            <p className="text-sm font-semibold text-[#0F172A] leading-tight">Nixon</p>
            <p className="text-xs text-[#94A3B8] leading-tight">Founder, WeClips</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Billing;
