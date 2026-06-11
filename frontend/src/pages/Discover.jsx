import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/context/AuthContext";
import { PlayCircle } from "lucide-react";

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
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-[#F1F5F9] rounded-lg" />
              <div className="mt-3 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F1F5F9]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
                  <div className="h-3 bg-[#F1F5F9] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-[#DC2626]" data-testid="discover-error">{error}</p>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-20 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="empty-discover">
          <PlayCircle className="mx-auto text-[#CBD5E1]" size={48} />
          <p className="mt-4 text-[#0F172A] font-semibold">No clips yet</p>
          <p className="text-sm text-[#64748B] mt-1">Be the first — become a member and share your first clip.</p>
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
