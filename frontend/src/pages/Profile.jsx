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

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600" data-testid="profile-error">{error}</p>;
  if (!data) return null;

  const { user, videos, is_following } = data;
  const isSelf = me?.id === user.id;

  return (
    <div data-testid="profile-page" className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end gap-6 fade-up">
        <div className="w-24 h-24 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-bold">
          {user.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900" data-testid="profile-username">@{user.username}</h1>
            {user.is_premium && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Premium</span>
            )}
          </div>
          <p className="mt-2 text-slate-500 text-sm flex gap-5">
            <span data-testid="profile-followers"><b className="text-slate-900">{user.followers_count}</b> followers</span>
            <span data-testid="profile-following"><b className="text-slate-900">{user.following_count}</b> following</span>
            <span><b className="text-slate-900">{videos.length}</b> videos</span>
          </p>
          {user.bio && <p className="mt-3 text-slate-700 max-w-xl">{user.bio}</p>}
        </div>
        <div>
          {!isSelf && me && (
            <Button
              onClick={toggleFollow}
              disabled={busy}
              data-testid="profile-follow-btn"
              className={is_following
                ? "bg-slate-100 hover:bg-slate-200 text-slate-900 h-10 rounded-lg font-semibold px-5"
                : "bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-lg font-semibold px-5"}
            >
              {is_following ? <><UserCheck size={16} className="mr-2"/> Following</> : <><UserPlus size={16} className="mr-2"/> Follow</>}
            </Button>
          )}
          {!me && (
            <Link to="/auth"><Button className="bg-slate-900 text-white h-10 rounded-lg font-semibold px-5">Log in to follow</Button></Link>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-6 tracking-tight">Videos</h2>
        {videos.length === 0 ? (
          <p className="text-slate-500" data-testid="profile-no-videos">No videos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
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
