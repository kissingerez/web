import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { Bell, Heart, MessageCircle, UserPlus, Flag } from "lucide-react";

const typeIcon = (type) => {
  if (type === "follow") return <UserPlus size={15} className="text-[#2B8FCA]" />;
  if (type === "like") return <Heart size={15} className="text-[#DC2626]" />;
  if (type === "comment") return <MessageCircle size={15} className="text-[#0B5C8C]" />;
  if (type?.startsWith("report") || type?.includes("moderation") || type?.includes("warn")) return <Flag size={15} className="text-[#F59E0B]" />;
  return <Bell size={15} className="text-[#94A3B8]" />;
};

const notifText = (n) => {
  if (n.type === "follow") return "started following you";
  if (n.type === "like") return `liked your clip${n.video_title ? ` “${n.video_title}”` : ""}`;
  if (n.type === "comment") return `commented${n.video_title ? ` on “${n.video_title}”` : ""}${n.text ? `: “${n.text}”` : ""}`;
  return n.text || n.type;
};

const notifLink = (n) => {
  if (n.video_id) return `/watch/${n.video_id}`;
  if (n.actor_username) return `/u/${n.actor_username}`;
  return null;
};

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    api.get("/notifications")
      .then((r) => {
        setItems(r.data);
        return api.post("/notifications/mark-read").catch(() => {});
      })
      .catch((e) => setError(errMsg(e, "Could not load notifications")))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  return (
    <div data-testid="notifications-page" className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl tracking-tight font-extrabold text-[#0F172A]">Notifications</h1>
        <p className="mt-2 text-[#475569]">Follows, likes and comments on your clips.</p>
      </header>

      {loading && <p className="text-[#64748B]">Loading…</p>}
      {!loading && error && <p className="text-[#DC2626]">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="notifications-empty">
          <Bell className="mx-auto text-[#CBD5E1]" size={48} />
          <p className="mt-4 text-[#0F172A] font-semibold">Nothing yet</p>
          <p className="text-sm text-[#64748B] mt-1">When people follow you or react to your clips, it shows up here.</p>
        </div>
      )}

      <ul className="divide-y divide-[#F1F5F9]">
        {items.map((n) => {
          const link = notifLink(n);
          const body = (
            <div className={`flex gap-3 py-4 ${!n.read ? "bg-[#F4FAFF] -mx-3 px-3 rounded-md" : ""}`}>
              {n.actor_avatar ? (
                <img src={n.actor_avatar} alt={n.actor_name}
                     className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                     onError={(e)=>{e.target.style.display="none";}}/>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center font-semibold shrink-0">
                  {n.actor_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#0F172A]">
                  <span className="font-semibold">{n.actor_name}</span>{" "}
                  <span className="text-[#475569]">{notifText(n)}</span>
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
                  {typeIcon(n.type)} {timeAgo(n.created_at)}
                </p>
              </div>
            </div>
          );
          return (
            <li key={n.id} data-testid={`notification-${n.id}`}>
              {link ? <Link to={link} className="block hover:opacity-80">{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
