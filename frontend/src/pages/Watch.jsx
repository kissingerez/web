import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Comments from "@/components/Comments";
import ReportDialog from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 as Crown, Trash2, Eye, Heart, Flag, Share2 } from "lucide-react";

const Watch = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [shares, setShares] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    api.get(`/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        setLikes(res.data.likes || 0);
        setShares(res.data.shares || 0);
        setPaywall(false);
      })
      .catch((e) => {
        if (e?.response?.status === 401) {
          navigate("/auth", { state: { from: `/watch/${id}` } });
        } else if (e?.response?.status === 402) {
          setPaywall(true);
        } else {
          setError(errMsg(e, "Failed to load video"));
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
      toast.error(errMsg(e, "Delete failed"));
    }
  };

  const toggleLike = async () => {
    if (!user) { navigate("/auth"); return; }
    try {
      const r = await api.post(`/videos/${id}/like`);
      setLiked(!!r.data?.liked);
      if (r.data?.likes != null) setLikes(r.data.likes);
    } catch (e) {
      toast.error(errMsg(e, "Could not like clip"));
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/api/share/${id}`;
    api.post(`/videos/${id}/share`)
      .then((r) => { if (r.data?.shares != null) setShares(r.data.shares); })
      .catch(() => {});
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text: `Watch “${video.title}” on WeClips`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! Send it to a friend.");
      }
    } catch {
      // user closed the share sheet — no-op
    }
  };

  if (loading) return <p className="text-[#64748B]">Loading…</p>;

  if (paywall) {
    return (
      <div data-testid="watch-paywall" className="max-w-2xl mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-[#DCEEFB] text-[#0B5C8C] mb-4">
          <Lock size={28} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Members only</h1>
        <p className="mt-2 text-[#475569]">WeClips is an ad-free, member-supported video network. Become a Member for $0.99/month to watch any clip.</p>
        <Link to="/billing">
          <Button data-testid="watch-paywall-subscribe-btn" className="mt-6 brand-cta px-6 h-11 rounded-md font-bold">
            <Crown size={16} className="mr-2"/> Become a Member · $0.99
          </Button>
        </Link>
      </div>
    );
  }

  if (error) return <p className="text-[#DC2626]">{error}</p>;
  if (!video) return null;

  const isOwner = user?.id === video.owner_id;

  return (
    <div data-testid="watch-page" className="max-w-5xl mx-auto">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]" data-testid="watch-title">{video.title}</h1>
          <p className="mt-2 text-sm text-[#64748B] flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Eye size={14}/> {video.views} views</span>
            <span>·</span>
            <span>{timeAgo(video.created_at)}</span>
            {shares > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1" data-testid="watch-share-count">
                  <Share2 size={13}/> {shares} share{shares === 1 ? "" : "s"}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleLike}
            data-testid="watch-like-btn"
            className={`inline-flex items-center gap-1.5 px-3.5 h-10 rounded-md border text-sm font-semibold transition-colors ${
              liked
                ? "border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626]"
                : "border-[#E2E8F0] text-[#475569] hover:border-[#FCA5A5] hover:text-[#DC2626]"
            }`}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likes}
          </button>

          <button
            onClick={handleShare}
            data-testid="watch-share-btn"
            className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-md border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:border-[#89CFF0] hover:text-[#0B5C8C] transition-colors"
          >
            <Share2 size={16} /> Share
          </button>

          <Link to={`/u/${video.owner_username}`} className="flex items-center gap-3 group" data-testid="watch-creator-link">
            {video.owner_avatar ? (
              <img src={video.owner_avatar} alt={video.owner_display_name || video.owner_username}
                   className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0]"
                   onError={(e)=>{e.target.style.display="none";}}/>
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center font-semibold">
                {(video.owner_display_name || video.owner_username)?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-[#0F172A] group-hover:text-[#2B8FCA]">
                {video.owner_display_name || video.owner_username}
              </p>
              <p className="text-xs text-[#64748B]">@{video.owner_username}</p>
            </div>
          </Link>

          {isOwner ? (
            <button
              onClick={handleDelete}
              data-testid="watch-delete-btn"
              className="p-2 rounded-md text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
              aria-label="Delete clip"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            user && (
              <button
                onClick={() => setReportOpen(true)}
                data-testid="watch-report-btn"
                className="p-2 rounded-md text-[#94A3B8] hover:bg-[#FEF3C7] hover:text-[#B45309]"
                aria-label="Report clip"
              >
                <Flag size={17} />
              </button>
            )
          )}
        </div>
      </div>

      {video.description && (
        <div className="mt-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-5 text-[#475569] whitespace-pre-wrap" data-testid="watch-description">
          {video.description}
        </div>
      )}

      <Comments videoId={id} />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Report this clip"
        endpoint={`/videos/${id}/report`}
      />
    </div>
  );
};

export default Watch;
