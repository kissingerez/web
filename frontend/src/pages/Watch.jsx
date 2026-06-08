import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Trash2, Eye } from "lucide-react";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

const Watch = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    api.get(`/videos/${id}`)
      .then((res) => { setVideo(res.data); setPaywall(false); })
      .catch((e) => {
        if (e?.response?.status === 401) {
          navigate("/auth", { state: { from: `/watch/${id}` } });
        } else if (e?.response?.status === 402) {
          setPaywall(true);
        } else {
          setError(e?.response?.data?.detail || "Failed to load video");
        }
      })
      .finally(() => setLoading(false));
  }, [id, authLoading, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this clip? This cannot be undone.")) return;
    try {
      await api.delete(`/videos/${id}`);
      navigate("/");
    } catch (e) {
      alert(e?.response?.data?.detail || "Delete failed");
    }
  };

  if (loading) return <p className="text-[#8C8C8C]">Loading…</p>;

  if (paywall) {
    return (
      <div data-testid="watch-paywall" className="max-w-2xl mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-[#4D1317] text-[#FFD9DB] mb-4">
          <Lock size={28} />
        </div>
        <h1 className="font-display text-4xl font-black tracking-tight text-white uppercase">Members only</h1>
        <p className="mt-2 text-[#B3B3B3]">WeClips is an ad-free, member-supported video network. Become a Member for $0.99/month to watch any clip.</p>
        <Link to="/billing">
          <Button data-testid="watch-paywall-subscribe-btn" className="mt-6 brand-cta px-6 h-11 rounded-md font-bold uppercase">
            <Crown size={16} className="mr-2"/> Become a Member · $0.99
          </Button>
        </Link>
      </div>
    );
  }

  if (error) return <p className="text-[#E63946]">{error}</p>;
  if (!video) return null;

  const isOwner = user?.id === video.owner_id;

  return (
    <div data-testid="watch-page" className="max-w-5xl mx-auto">
      <div className="relative rounded-md overflow-hidden bg-black aspect-video">
        <video
          src={video.url}
          controls
          autoPlay
          playsInline
          className="w-full h-full"
          data-testid="watch-video-player"
        />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white" data-testid="watch-title">{video.title}</h1>
          <p className="mt-2 text-sm text-[#8C8C8C] flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Eye size={14}/> {video.views} views</span>
            <span>·</span>
            <span>{timeAgo(video.created_at)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/u/${video.owner_username}`} className="flex items-center gap-3 group" data-testid="watch-creator-link">
            <div className="w-11 h-11 rounded-full bg-[#262626] border border-[#333] text-white flex items-center justify-center font-semibold">
              {video.owner_username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-[#E63946]">@{video.owner_username}</p>
              <p className="text-xs text-[#8C8C8C]">Creator</p>
            </div>
          </Link>
          {isOwner && (
            <button
              onClick={handleDelete}
              data-testid="watch-delete-btn"
              className="p-2 rounded-md text-[#8C8C8C] hover:bg-[#4D1317] hover:text-[#FFD9DB]"
              aria-label="Delete clip"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {video.description && (
        <div className="mt-6 bg-[#1A1A1A] border border-[#262626] rounded-md p-5 text-[#B3B3B3] whitespace-pre-wrap" data-testid="watch-description">
          {video.description}
        </div>
      )}
    </div>
  );
};

export default Watch;
