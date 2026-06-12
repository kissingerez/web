import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield, Flag, Video, User as UserIcon, MessageCircle, CheckCircle2,
  AlertTriangle, Ban, Clock, Trash2, UserCheck,
} from "lucide-react";

const targetIcon = (type) => {
  if (type === "video") return <Video size={14} />;
  if (type === "user") return <UserIcon size={14} />;
  if (type === "comment") return <MessageCircle size={14} />;
  return <Flag size={14} />;
};

const statusColor = (status) => {
  if (status === "open" || status === "pending") return "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]";
  if (status === "dismissed") return "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]";
  return "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]";
};

const ActionDialog = ({ action, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  if (!action) return null;
  const labels = {
    warn: { title: "Warn user", desc: "Sends a warning to the reported user.", color: "bg-[#F59E0B] hover:bg-[#D97706]" },
    suspend: { title: "Suspend user", desc: "Temporarily bans the user for a number of days.", color: "bg-[#EA580C] hover:bg-[#C2410C]" },
    ban: { title: "Ban user permanently", desc: "Permanently bans the reported user.", color: "bg-[#DC2626] hover:bg-[#B91C1C]" },
  };
  const cfg = labels[action.kind];
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(action, { reason: reason.trim() || null, days });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="moderation-action-dialog">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">{cfg.title}</DialogTitle>
          <DialogDescription>{cfg.desc}</DialogDescription>
        </DialogHeader>
        {action.kind === "suspend" && (
          <div>
            <label className="text-sm font-semibold text-[#0F172A]">Days (1–365)</label>
            <Input type="number" min={1} max={365} value={days}
                   onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                   data-testid="suspend-days-input" className="mt-1.5 w-28" />
          </div>
        )}
        <div>
          <label className="text-sm font-semibold text-[#0F172A]">Reason (optional)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
                    placeholder="Shown to the user…" data-testid="moderation-reason-input" className="mt-1.5 min-h-[70px]" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-md">Cancel</Button>
          <Button onClick={confirm} disabled={busy} data-testid="moderation-confirm-btn"
                  className={`${cfg.color} text-white rounded-md`}>
            {busy ? "Working…" : cfg.title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ReportCard = ({ rep, onAction, onQuick }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg p-5" data-testid={`report-${rep.id}`}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#64748B] inline-flex items-center gap-1.5">
          {targetIcon(rep.target_type)} {rep.target_type} report
          <span className={`px-2 py-0.5 rounded-md border text-[10px] ${statusColor(rep.status)}`}>{rep.status}</span>
          {rep.target_missing && <span className="px-2 py-0.5 rounded-md border bg-[#F1F5F9] text-[#64748B] text-[10px]">content deleted</span>}
        </p>
        <p className="mt-2 text-sm text-[#0F172A]"><b>Reason:</b> {rep.reason}</p>
        <p className="mt-1 text-xs text-[#64748B]">
          Reported by {rep.reporter_name || rep.reporter_username || "unknown"} · {timeAgo(rep.created_at)}
        </p>
      </div>
      {rep.video_thumbnail_url && (
        <img src={rep.video_thumbnail_url} alt="" className="w-24 h-14 rounded-md object-cover border border-[#E2E8F0]"
             onError={(e)=>{e.target.style.display="none";}}/>
      )}
    </div>

    <div className="mt-3 text-sm text-[#475569] bg-[#F8FAFC] border border-[#F1F5F9] rounded-md px-3 py-2">
      {rep.target_type === "video" && (
        <>
          Clip: <Link to={`/watch/${rep.target_id}`} className="text-[#2B8FCA] underline">{rep.video_title || rep.target_id}</Link>
          {rep.video_creator_name && <> · by {rep.video_creator_name}</>}
        </>
      )}
      {rep.target_type === "user" && (
        <>User: {rep.user_username
          ? <Link to={`/u/${rep.user_username}`} className="text-[#2B8FCA] underline">{rep.user_display_name || rep.user_username}</Link>
          : (rep.user_display_name || rep.target_id)}</>
      )}
      {rep.target_type === "comment" && <>Comment: “{rep.video_title || rep.target_id}”</>}
      {rep.target_user_id && (
        <span className="block mt-1 text-xs text-[#94A3B8]">
          Target user: {rep.target_warnings_count} warning{rep.target_warnings_count === 1 ? "" : "s"}
          {rep.target_is_banned && <> · currently {rep.target_ban_type === "permanent" ? "banned" : `suspended until ${new Date(rep.target_banned_until).toLocaleDateString()}`}</>}
        </span>
      )}
    </div>

    {(rep.status === "open" || rep.status === "pending") && (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onQuick(rep, "dismiss")} data-testid={`dismiss-btn-${rep.id}`} className="rounded-md text-xs">
          <CheckCircle2 size={13} className="mr-1.5" /> Dismiss
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction({ rep, kind: "warn" })} data-testid={`warn-btn-${rep.id}`} className="rounded-md text-xs text-[#B45309]">
          <AlertTriangle size={13} className="mr-1.5" /> Warn
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction({ rep, kind: "suspend" })} data-testid={`suspend-btn-${rep.id}`} className="rounded-md text-xs text-[#C2410C]">
          <Clock size={13} className="mr-1.5" /> Suspend
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction({ rep, kind: "ban" })} data-testid={`ban-btn-${rep.id}`} className="rounded-md text-xs text-[#DC2626]">
          <Ban size={13} className="mr-1.5" /> Ban
        </Button>
        {!rep.target_missing && rep.target_type !== "user" && (
          <Button size="sm" variant="outline" onClick={() => onQuick(rep, "delete-content")} data-testid={`delete-content-btn-${rep.id}`} className="rounded-md text-xs text-[#DC2626]">
            <Trash2 size={13} className="mr-1.5" /> Delete content
          </Button>
        )}
      </div>
    )}
  </div>
);

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [banned, setBanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/admin/reports"), api.get("/admin/banned-accounts")])
      .then(([r, b]) => { setReports(r.data); setBanned(b.data); setForbidden(false); setError(null); })
      .catch((e) => {
        if (e?.response?.status === 403) setForbidden(true);
        else setError(errMsg(e, "Could not load moderation data"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    load();
  }, [user, authLoading, navigate, load]);

  const quick = async (rep, kind) => {
    const labels = { dismiss: "Report dismissed", "delete-content": "Content deleted" };
    if (kind === "delete-content" && !window.confirm("Delete the reported content? This cannot be undone.")) return;
    try {
      await api.post(`/admin/reports/${rep.id}/${kind}`);
      toast.success(labels[kind]);
      load();
    } catch (e) {
      toast.error(errMsg(e, "Action failed"));
    }
  };

  const confirmAction = async ({ rep, kind }, { reason, days }) => {
    try {
      const body = kind === "suspend" ? { days, reason } : { reason };
      await api.post(`/admin/reports/${rep.id}/${kind}`, body);
      toast.success(kind === "warn" ? "Warning sent" : kind === "suspend" ? `Suspended for ${days} day(s)` : "User banned");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Action failed"));
    }
  };

  const unban = async (acc) => {
    if (!window.confirm(`Unban ${acc.display_name}?`)) return;
    try {
      await api.post(`/admin/users/${acc.id}/unban`);
      toast.success(`${acc.display_name} unbanned`);
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unban failed"));
    }
  };

  if (authLoading || !user) return <p className="text-[#64748B]">Loading…</p>;

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto text-center py-20" data-testid="admin-forbidden">
        <Shield className="mx-auto text-[#CBD5E1]" size={48} />
        <h1 className="mt-4 text-2xl font-extrabold text-[#0F172A]">Founders only</h1>
        <p className="mt-2 text-[#64748B]">This area is reserved for the WeClips founder account.</p>
      </div>
    );
  }

  const openCount = reports.filter((r) => r.status === "open" || r.status === "pending").length;

  return (
    <div data-testid="admin-page" className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl tracking-tight font-extrabold text-[#0F172A] inline-flex items-center gap-3">
          <Shield className="text-[#2B8FCA]" size={32} /> Moderation
        </h1>
        <p className="mt-2 text-[#475569]">Review reports and manage banned accounts — same powers as the mobile app.</p>
      </header>

      <div className="flex gap-2">
        <button onClick={() => setTab("reports")} data-testid="admin-tab-reports"
                className={`px-4 py-2 rounded-md text-sm font-semibold border ${tab === "reports" ? "bg-[#0F172A] text-white border-[#0F172A]" : "border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"}`}>
          Reports{openCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px]">{openCount}</span>}
        </button>
        <button onClick={() => setTab("banned")} data-testid="admin-tab-banned"
                className={`px-4 py-2 rounded-md text-sm font-semibold border ${tab === "banned" ? "bg-[#0F172A] text-white border-[#0F172A]" : "border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"}`}>
          Banned accounts ({banned.length})
        </button>
      </div>

      {loading && <p className="text-[#64748B]">Loading…</p>}
      {!loading && error && <p className="text-[#DC2626]">{error}</p>}

      {!loading && !error && tab === "reports" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="admin-no-reports">
              <Flag className="mx-auto text-[#CBD5E1]" size={40} />
              <p className="mt-3 text-[#0F172A] font-semibold">No reports</p>
              <p className="text-sm text-[#64748B] mt-1">When members report clips, comments or users, they appear here.</p>
            </div>
          ) : (
            reports.map((rep) => <ReportCard key={rep.id} rep={rep} onAction={setAction} onQuick={quick} />)
          )}
        </div>
      )}

      {!loading && !error && tab === "banned" && (
        <div className="space-y-3">
          {banned.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="admin-no-banned">
              <UserCheck className="mx-auto text-[#CBD5E1]" size={40} />
              <p className="mt-3 text-[#0F172A] font-semibold">No banned accounts</p>
            </div>
          ) : (
            banned.map((acc) => (
              <div key={acc.id} className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex items-center gap-3" data-testid={`banned-${acc.id}`}>
                {acc.avatar_url ? (
                  <img src={acc.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0]"
                       onError={(e)=>{e.target.style.display="none";}}/>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] flex items-center justify-center font-semibold">
                    {acc.display_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0F172A]">{acc.display_name} {acc.username && <span className="text-[#64748B] font-normal">@{acc.username}</span>}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {acc.ban_type === "permanent" ? "Permanently banned" : acc.banned_until ? `Suspended until ${new Date(acc.banned_until).toLocaleDateString()}` : "Banned"}
                    {acc.ban_reason && <> · {acc.ban_reason}</>}
                    {acc.banned_at && <> · {timeAgo(acc.banned_at)}</>}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => unban(acc)} data-testid={`unban-btn-${acc.id}`} className="rounded-md text-xs">
                  Unban
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <ActionDialog action={action} onClose={() => setAction(null)} onConfirm={confirmAction} />
    </div>
  );
}
