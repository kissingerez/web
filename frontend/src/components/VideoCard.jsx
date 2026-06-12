import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Eye, ImageOff } from "lucide-react";

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
  const [thumbBroken, setThumbBroken] = useState(false);
  const showThumb = video.thumbnail_url && !thumbBroken;
  const duration = formatDuration(video.duration);
  const displayName = video.owner_display_name || video.owner_username || "Creator";
  const handle = video.owner_username || "";

  return (
    <div data-testid={`video-card-${video.id}`} className="group block fade-up">
      <Link to={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg thumb-lift bg-[#F1F5F9]">
        {showThumb ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setThumbBroken(true)}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[#E2E8F0] text-[#94A3B8]"
            data-testid={`no-thumbnail-${video.id}`}
          >
            <ImageOff size={28} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">No thumbnail</span>
          </div>
        )}
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
      </Link>
      <div className="mt-3 flex gap-3">
        <Link to={handle ? `/u/${handle}` : `/watch/${video.id}`} className="shrink-0" aria-label={`${displayName}'s profile`}>
          {video.owner_avatar ? (
            <img
              src={video.owner_avatar}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] bg-[#F1F5F9]"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#DCEEFB] text-[#0A1929] flex items-center justify-center text-sm font-semibold border border-[#89CFF0]">
              {displayName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-semibold text-[0.97rem] leading-snug line-clamp-2 text-[#0F172A] group-hover:text-[#2B8FCA] transition-colors">
              {video.title}
            </h3>
          </Link>
          {handle ? (
            <Link
              to={`/u/${handle}`}
              data-testid={`video-card-creator-${video.id}`}
              className="block text-xs text-[#475569] mt-1 font-medium hover:text-[#2B8FCA] hover:underline underline-offset-2 transition-colors truncate"
            >
              {displayName}
              <span className="text-[#94A3B8] font-normal"> · @{handle}</span>
            </Link>
          ) : (
            <p className="text-xs text-[#475569] mt-1 font-medium">{displayName}</p>
          )}
          <p className="text-[11px] text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
            <Eye size={11}/> {formatViews(video.views)} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
