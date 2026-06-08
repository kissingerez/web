import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, PlayCircle } from "lucide-react";
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
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl tracking-tighter font-black text-slate-900">
              Discover videos.
            </h1>
            <p className="mt-3 text-slate-500 text-lg max-w-xl">
              An ad-free space for creators. Watch, follow, and upload — all on slate.
            </p>
          </div>
          {!user?.is_premium && (
            <Link
              to="/billing"
              data-testid="hero-subscribe-btn"
              className="hidden sm:inline-flex items-center gap-2 gold-shimmer text-white rounded-lg px-5 py-3 font-semibold"
            >
              <Sparkles size={16} /> Unlock all for $0.99
            </Link>
          )}
        </div>
      </section>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-slate-100 rounded-xl" />
              <div className="mt-3 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-red-600" data-testid="discover-error">{error}</p>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl" data-testid="empty-discover">
          <PlayCircle className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 text-slate-600 font-medium">No videos yet</p>
          <p className="text-sm text-slate-400 mt-1">Be the first to upload — subscribe and share your first clip.</p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} locked={!user?.is_premium} />
          ))}
        </section>
      )}
    </div>
  );
};

export default Discover;
