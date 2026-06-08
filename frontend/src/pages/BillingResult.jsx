import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BillingSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refreshMe } = useAuth();
  const [status, setStatus] = useState("polling");
  const [details, setDetails] = useState(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      attempts.current += 1;
      try {
        const res = await api.get(`/payments/checkout/${sessionId}`);
        setDetails(res.data);
        if (res.data.payment_status === "paid") {
          await refreshMe();
          setStatus("paid");
          return;
        }
        if (res.data.status === "expired" || attempts.current > 30) {
          setStatus("expired");
          return;
        }
      } catch (e) {
        if (attempts.current > 30) { setStatus("error"); return; }
      }
      setTimeout(poll, 2000);
    };
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div data-testid="billing-success-page" className="max-w-xl mx-auto py-12 text-center">
      {status === "polling" && (
        <>
          <Loader2 className="mx-auto animate-spin text-[#8C8C8C]" size={40}/>
          <h1 className="font-display mt-5 text-3xl font-black uppercase text-white">Confirming payment…</h1>
          <p className="mt-2 text-[#8C8C8C] text-sm">This usually takes a few seconds.</p>
        </>
      )}
      {status === "paid" && (
        <>
          <CheckCircle2 className="mx-auto text-[#2A9D8F]" size={56}/>
          <h1 className="font-display mt-5 text-4xl font-black uppercase tracking-tight text-white">You're in.</h1>
          <p className="mt-2 text-[#B3B3B3]">Membership unlocked. Welcome to ad-free WeClips.</p>
          {details?.premium_until && (
            <p className="mt-1 text-xs text-[#666]">Active until {new Date(details.premium_until).toLocaleDateString()}</p>
          )}
          <Link to="/"><Button className="mt-6 brand-cta h-11 px-6 rounded-md font-bold uppercase" data-testid="success-go-discover">Go to Discover</Button></Link>
        </>
      )}
      {(status === "expired" || status === "error") && (
        <>
          <XCircle className="mx-auto text-[#E63946]" size={56}/>
          <h1 className="font-display mt-5 text-3xl font-black uppercase text-white">Payment not completed</h1>
          <p className="mt-2 text-[#B3B3B3]">Your session expired or wasn't completed.</p>
          <Link to="/billing"><Button className="mt-6 brand-cta h-11 px-6 rounded-md font-bold uppercase">Try again</Button></Link>
        </>
      )}
    </div>
  );
};

export const BillingCancel = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="billing-cancel-page" className="max-w-xl mx-auto py-12 text-center">
      <XCircle className="mx-auto text-[#4D4D4D]" size={56}/>
      <h1 className="font-display mt-5 text-3xl font-black uppercase text-white">Subscription canceled</h1>
      <p className="mt-2 text-[#B3B3B3]">No charge was made. You can become a member anytime.</p>
      <Button onClick={() => navigate("/billing")} className="mt-6 brand-cta h-11 px-6 rounded-md font-bold uppercase">Back to billing</Button>
    </div>
  );
};
