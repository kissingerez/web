import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/context/AuthContext";
import { PlayCircle, Search as SearchIcon } from "lucide-react";

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/videos")
      .then((res) => setVideos(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load videos"))
      .finally(() => setLoading(false));
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div data-testid="discover-page" className="space-y-6">
      <form onSubmit={submitSearch} className="relative" data-testid="discover-search-form">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        <input
          type="search"
          inputMode="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creators on WeClips…"
          data-testid="discover-search-input"
          aria-label="Search creators"
          className="w-full h-12 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#89CFF0] focus:ring-2 focus:ring-[#DCEEFB]"
        />
      </form>

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
        <div className="text-center py-16 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="empty-discover">
          <img
            src="/weclips-banner-1280.png"
            alt="WeClips"
            className="mx-auto w-full max-w-[320px] h-auto"
          />
          <p className="mt-6 text-[#0F172A] font-semibold">No clips yet</p>
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
