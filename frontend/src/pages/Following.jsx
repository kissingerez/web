import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

const Following = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    api.get("/videos/following")
      .then((res) => setVideos(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  return (
    <div data-testid="following-page" className="space-y-10">
      <header>
        <h1 className="font-display text-5xl tracking-tight font-black text-white uppercase">Following</h1>
        <p className="mt-2 text-[#B3B3B3]">Latest clips from creators you follow.</p>
      </header>

      {loading && <p className="text-[#8C8C8C]">Loading…</p>}
      {!loading && error && <p className="text-[#E63946]">{error}</p>}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#333] rounded-md" data-testid="empty-following">
          <Users className="mx-auto text-[#4D4D4D]" size={48} />
          <p className="mt-4 text-white font-semibold">No clips in your feed yet</p>
          <p className="text-sm text-[#8C8C8C] mt-1">
            Follow creators on the <Link to="/" className="text-[#E63946] underline">Discover page</Link> to see their uploads here.
          </p>
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

export default Following;
