import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/context/AuthContext";
import { Crown, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Discover = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/videos")
      .then((res) => setVideos(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load videos"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="discover-page" className="space-y-10">
      <section className="fade-up">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl tracking-tight font-black text-white uppercase">
              Discover.
            </h1>
            <p className="mt-3 text-[#B3B3B3] text-base max-w-xl">
              An ad-free, human-made video network. Watch, follow, and upload — all on WeClips.
            </p>
          </div>
          {!user?.is_premium && (
            <Link
              to="/billing"
              data-testid="hero-subscribe-btn"
              className="hidden sm:inline-flex items-center gap-2 brand-cta rounded-md px-5 py-3 text-sm"
            >
              <Crown size={16} /> Become a Member · $0.99
            </Link>
          )}
        </div>
      </section>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-[#1A1A1A] rounded-md" />
              <div className="mt-3 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1A1A1A]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1A1A1A] rounded w-3/4" />
                  <div className="h-3 bg-[#1A1A1A] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-[#E63946]" data-testid="discover-error">{error}</p>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-20 border border-dashed border-[#333] rounded-md" data-testid="empty-discover">
          <PlayCircle className="mx-auto text-[#4D4D4D]" size={48} />
          <p className="mt-4 text-white font-semibold">No clips yet</p>
          <p className="text-sm text-[#8C8C8C] mt-1">Be the first — become a member and share your first clip.</p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} locked={!user?.is_premium} />
          ))}
        </section>
      )}
    </div>
  );
};

export default Discover;
