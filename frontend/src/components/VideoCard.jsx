import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const PLACEHOLDER_THUMB = "https://images.unsplash.com/photo-1759034577145-1bce7714f46e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMHRodW1ibmFpbCUyMGxhbmRzY2FwZXxlbnwwfHx8fDE3ODA5MjQ3Njd8MA&ixlib=rb-4.1.0&q=85";

function formatDuration(sec) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatViews(v) {
  if (v == null) return "0 views";
  if (v < 1000) return `${v} views`;
  if (v < 1_000_000) return `${(v / 1000).toFixed(1)}K views`;
  return `${(v / 1_000_000).toFixed(1)}M views`;
}

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

const VideoCard = ({ video, locked = false }) => {
  const thumb = video.thumbnail_url || PLACEHOLDER_THUMB;
  const duration = formatDuration(video.duration);

  return (
    <Link
      to={`/watch/${video.id}`}
      data-testid={`video-card-${video.id}`}
      className="group block fade-up"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl thumb-lift bg-slate-100">
        <img
          src={thumb}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDER_THUMB; }}
        />
        {duration && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-medium text-white bg-black/75">
            {duration}
          </span>
        )}
        {locked && (
          <div className="absolute inset-0 paywall-glass flex items-center justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-amber-700 text-xs font-semibold">
              <Lock size={12} /> Premium
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {video.owner_username?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[0.97rem] leading-snug line-clamp-2 text-slate-900 group-hover:text-[#ff3b30]">
            {video.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">@{video.owner_username}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatViews(video.views)} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
