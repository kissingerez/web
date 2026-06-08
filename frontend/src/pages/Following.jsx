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
        <h1 className="text-4xl tracking-tighter font-black text-slate-900">Following</h1>
        <p className="mt-2 text-slate-500">Latest videos from creators you follow.</p>
      </header>

      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl" data-testid="empty-following">
          <Users className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 text-slate-600 font-medium">No videos in your feed yet</p>
          <p className="text-sm text-slate-400 mt-1">Follow creators on the <Link to="/" className="text-[#ff3b30] underline">Discover page</Link> to see their uploads here.</p>
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

export default Following;
