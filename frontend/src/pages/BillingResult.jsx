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
          <Loader2 className="mx-auto animate-spin text-slate-400" size={40}/>
          <h1 className="mt-5 text-2xl font-bold">Confirming your payment…</h1>
          <p className="mt-2 text-slate-500 text-sm">This usually takes a few seconds.</p>
        </>
      )}
      {status === "paid" && (
        <>
          <CheckCircle2 className="mx-auto text-emerald-600" size={56}/>
          <h1 className="mt-5 text-3xl font-black tracking-tight">You're in.</h1>
          <p className="mt-2 text-slate-500">Premium unlocked. Welcome to ad-free slate.</p>
          {details?.premium_until && (
            <p className="mt-1 text-xs text-slate-400">Active until {new Date(details.premium_until).toLocaleDateString()}</p>
          )}
          <Link to="/"><Button className="mt-6 bg-slate-900 text-white h-11 px-6 rounded-lg font-semibold" data-testid="success-go-discover">Go to Discover</Button></Link>
        </>
      )}
      {(status === "expired" || status === "error") && (
        <>
          <XCircle className="mx-auto text-red-600" size={56}/>
          <h1 className="mt-5 text-2xl font-bold">Payment not completed</h1>
          <p className="mt-2 text-slate-500">Your session expired or wasn't completed.</p>
          <Link to="/billing"><Button className="mt-6 bg-slate-900 text-white h-11 px-6 rounded-lg">Try again</Button></Link>
        </>
      )}
    </div>
  );
};

export const BillingCancel = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="billing-cancel-page" className="max-w-xl mx-auto py-12 text-center">
      <XCircle className="mx-auto text-slate-400" size={56}/>
      <h1 className="mt-5 text-2xl font-bold">Subscription canceled</h1>
      <p className="mt-2 text-slate-500">No charge was made. You can subscribe again anytime.</p>
      <Button onClick={() => navigate("/billing")} className="mt-6 bg-slate-900 text-white h-11 px-6 rounded-lg">Back to billing</Button>
    </div>
  );
};
