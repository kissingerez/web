import React from "react";
import { Link } from "react-router-dom";
import { Lock, Eye } from "lucide-react";

const PLACEHOLDER_THUMB = "https://images.unsplash.com/photo-1598512946582-8aa2bca6abc0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwzfHxjaW5lbWF0aWMlMjBsYW5kc2NhcGUlMjB2aWRlbyUyMHRodW1ibmFpbHxlbnwwfHx8fDE3ODA1MjE4NDl8MA&ixlib=rb-4.1.0&q=85";

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
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 2592000)}mo`;
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
      <div className="relative aspect-video w-full overflow-hidden rounded-lg thumb-lift bg-[#F1F5F9]">
        <img
          src={thumb}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDER_THUMB; }}
        />
        <div className="thumb-overlay absolute inset-0 opacity-0 transition-opacity duration-200 dark-scrim" />
        {duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-semibold text-white bg-black/80 tabular-nums">
            {duration}
          </span>
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md brand-cta text-xs">
              <Lock size={12} /> Members only
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-[#DCEEFB] text-[#0B5C8C] flex items-center justify-center text-sm font-semibold shrink-0 border border-[#BFE0F5]">
          {video.owner_username?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[0.97rem] leading-snug line-clamp-2 text-[#0F172A] group-hover:text-[#2B8FCA] transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-[#64748B] mt-1">@{video.owner_username}</p>
          <p className="text-[11px] text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
            <Eye size={11}/> {formatViews(video.views)} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
