import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Comments from "@/components/Comments";
import ReportDialog from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 as Crown, Trash2, Eye, Heart, Flag, Share2, Twitter, Link2, MessageCircle } from "lucide-react";

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
  const [shareOpen, setShareOpen] = useState(false);
  const shareWrapRef = useRef(null);

  // Close share menu on outside click / Esc
  useEffect(() => {
    if (!shareOpen) return;
    const onDown = (e) => {
      if (shareWrapRef.current && !shareWrapRef.current.contains(e.target)) setShareOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setShareOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

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

  const trackShare = () => {
    api.post(`/videos/${id}/share`)
      .then((r) => { if (r.data?.shares != null) setShares(r.data.shares); })
      .catch(() => {});
  };

  const shareUrl = video ? `${window.location.origin}/api/share/${id}` : "";
  const shareCaption = video ? `Watch "${video.title}" on @weclips — ad-free, Christian, and calm.` : "";

  const openNativeShare = async () => {
    setShareOpen(false);
    trackShare();
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text: shareCaption, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! Send it to a friend.");
      }
    } catch { /* user closed the share sheet — no-op */ }
  };

  const shareToX = () => {
    setShareOpen(false);
    trackShare();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToWhatsApp = () => {
    setShareOpen(false);
    trackShare();
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareCaption} ${shareUrl}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToSMS = () => {
    setShareOpen(false);
    trackShare();
    // iOS uses sms:&body=, Android uses sms:?body=
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const sep = isIOS ? "&" : "?";
    window.location.href = `sms:${sep}body=${encodeURIComponent(`${shareCaption} ${shareUrl}`)}`;
  };

  const copyLink = async () => {
    setShareOpen(false);
    trackShare();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link");
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
  const canDelete = isOwner || user?.is_founder;

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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black" data-testid="watch-title">{video.title}</h1>
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

          <div className="relative" ref={shareWrapRef}>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              data-testid="watch-share-btn"
              aria-haspopup="menu"
              aria-expanded={shareOpen}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-md border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:border-[#89CFF0] hover:text-[#0B5C8C] transition-colors"
            >
              <Share2 size={16} /> Share
            </button>

            {shareOpen && (
              <div
                role="menu"
                data-testid="watch-share-menu"
                className="absolute right-0 mt-2 z-30 w-56 bg-white border border-[#E2E8F0] rounded-md shadow-lg overflow-hidden"
              >
                <button onClick={shareToX} data-testid="share-to-x" role="menuitem"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9]">
                  <Twitter size={16} className="text-[#1DA1F2]"/> Share to X
                </button>
                <button onClick={shareToWhatsApp} data-testid="share-to-whatsapp" role="menuitem"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9]">
                  <MessageCircle size={16} className="text-[#25D366]"/> Share to WhatsApp
                </button>
                <button onClick={shareToSMS} data-testid="share-to-sms" role="menuitem"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9]">
                  <MessageCircle size={16} className="text-[#0B5C8C]"/> iMessage / SMS
                </button>
                <button onClick={openNativeShare} data-testid="share-native" role="menuitem"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9] border-t border-[#F1F5F9]">
                  <Share2 size={16} className="text-[#64748B]"/> More…
                </button>
                <button onClick={copyLink} data-testid="share-copy-link" role="menuitem"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9]">
                  <Link2 size={16} className="text-[#64748B]"/> Copy link
                </button>
              </div>
            )}
          </div>

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

          {canDelete ? (
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
