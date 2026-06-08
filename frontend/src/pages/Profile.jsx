import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";

const Profile = () => {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/users/${username}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "User not found"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [username]);

  const toggleFollow = async () => {
    if (!me) return;
    setBusy(true);
    try {
      if (data.is_following) {
        await api.delete(`/users/${username}/follow`);
      } else {
        await api.post(`/users/${username}/follow`);
      }
      load();
    } finally { setBusy(false); }
  };

  if (loading) return <p className="text-[#8C8C8C]">Loading…</p>;
  if (error) return <p className="text-[#E63946]" data-testid="profile-error">{error}</p>;
  if (!data) return null;

  const { user, videos, is_following } = data;
  const isSelf = me?.id === user.id;

  return (
    <div data-testid="profile-page" className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end gap-6 fade-up">
        <div className="w-24 h-24 rounded-md bg-[#262626] border border-[#333] text-white flex items-center justify-center text-3xl font-bold">
          {user.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white" data-testid="profile-username">@{user.username}</h1>
            {user.is_premium && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[#4D1317] text-[#FFD9DB] uppercase">Member</span>
            )}
          </div>
          <p className="mt-2 text-[#B3B3B3] text-sm flex gap-5">
            <span data-testid="profile-followers"><b className="text-white">{user.followers_count}</b> followers</span>
            <span data-testid="profile-following"><b className="text-white">{user.following_count}</b> following</span>
            <span><b className="text-white">{videos.length}</b> clips</span>
          </p>
          {user.bio && <p className="mt-3 text-[#B3B3B3] max-w-xl">{user.bio}</p>}
        </div>
        <div>
          {!isSelf && me && (
            <Button
              onClick={toggleFollow}
              disabled={busy}
              data-testid="profile-follow-btn"
              className={is_following
                ? "bg-[#262626] hover:bg-[#333] text-white h-10 rounded-md font-semibold px-5 border border-[#333]"
                : "brand-cta h-10 rounded-md font-bold px-5 uppercase"}
            >
              {is_following ? <><UserCheck size={16} className="mr-2"/> Following</> : <><UserPlus size={16} className="mr-2"/> Follow</>}
            </Button>
          )}
          {!me && (
            <Link to="/auth"><Button className="brand-cta h-10 rounded-md font-bold px-5 uppercase">Log in to follow</Button></Link>
          )}
        </div>
      </header>

      <section>
        <h2 className="font-display text-2xl font-bold mb-6 tracking-tight uppercase text-white">Clips</h2>
        {videos.length === 0 ? (
          <p className="text-[#8C8C8C]" data-testid="profile-no-videos">No clips uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} locked={!me?.is_premium} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
