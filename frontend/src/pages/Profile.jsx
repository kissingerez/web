import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import VideoCard from "@/components/VideoCard";
import UserListDialog from "@/components/UserListDialog";
import ReportDialog from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCheck, UserPlus, MoreHorizontal, Flag, UserX, Pencil } from "lucide-react";

const Profile = () => {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listKind, setListKind] = useState(null); // "followers" | "following" | null
  const [reportOpen, setReportOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/users/${username}`)
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e?.response?.status === 401) {
          navigate("/auth", { state: { from: `/u/${username}` } });
          return;
        }
        setError(errMsg(e, "User not found"));
      })
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

  const blockUser = async () => {
    if (!window.confirm(`Block @${username}? They won't be able to interact with you, and you won't see their content.`)) return;
    try {
      await api.post(`/users/by-id/${data.user.id}/block`);
      toast.success(`Blocked @${username}`);
      navigate("/");
    } catch (e) {
      toast.error(errMsg(e, "Could not block user"));
    }
  };

  if (loading) return <p className="text-[#64748B]">Loading…</p>;
  if (error) return <p className="text-[#DC2626]" data-testid="profile-error">{error}</p>;
  if (!data) return null;

  const { user, videos, is_following } = data;
  const isSelf = me?.id === user.id;

  return (
    <div data-testid="profile-page" className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end gap-6 fade-up">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.display_name || user.username}
               className="w-24 h-24 rounded-lg object-cover border border-[#E2E8F0] bg-[#F1F5F9]"
               onError={(e)=>{e.target.style.display="none";}}/>
        ) : (
          <div className="w-24 h-24 rounded-lg bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center text-3xl font-bold">
            {(user.display_name || user.username)?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]" data-testid="profile-displayname">
              {user.display_name || user.username}
            </h1>
            {user.is_premium && (
              <span className="brand-chip px-2.5 py-0.5 text-xs font-semibold rounded-md uppercase">Member</span>
            )}
          </div>
          <p className="text-sm text-[#64748B] mt-1" data-testid="profile-username">@{user.username}</p>
          <p className="mt-3 text-[#475569] text-sm flex gap-5">
            <button onClick={() => setListKind("followers")} data-testid="profile-followers" className="hover:text-[#2B8FCA] transition-colors">
              <b className="text-[#0F172A]">{user.followers_count}</b> followers
            </button>
            <button onClick={() => setListKind("following")} data-testid="profile-following" className="hover:text-[#2B8FCA] transition-colors">
              <b className="text-[#0F172A]">{user.following_count}</b> following
            </button>
            <span><b className="text-[#0F172A]">{videos.length}</b> clips</span>
          </p>
          {user.bio && <p className="mt-3 text-[#475569] max-w-xl">{user.bio}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isSelf && (
            <Link to="/settings">
              <Button variant="outline" data-testid="profile-edit-btn" className="h-10 rounded-md font-semibold px-5">
                <Pencil size={15} className="mr-2"/> Edit profile
              </Button>
            </Link>
          )}
          {!isSelf && me && (
            <>
              <Button
                onClick={toggleFollow}
                disabled={busy}
                data-testid="profile-follow-btn"
                className={is_following
                  ? "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] h-10 rounded-md font-semibold px-5 border border-[#E2E8F0]"
                  : "brand-cta h-10 rounded-md font-bold px-5"}
              >
                {is_following ? <><UserCheck size={16} className="mr-2"/> Following</> : <><UserPlus size={16} className="mr-2"/> Follow</>}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="profile-more-btn" className="p-2.5 rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]" aria-label="More options">
                    <MoreHorizontal size={18}/>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReportOpen(true)} data-testid="profile-report-item">
                    <Flag size={14} className="mr-2"/> Report user
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={blockUser} data-testid="profile-block-item" className="text-[#DC2626] focus:text-[#DC2626]">
                    <UserX size={14} className="mr-2"/> Block user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {!me && (
            <Link to="/auth"><Button className="brand-cta h-10 rounded-md font-bold px-5">Log in to follow</Button></Link>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-bold mb-6 tracking-tight text-[#0F172A]">Clips</h2>
        {videos.length === 0 ? (
          <p className="text-[#64748B]" data-testid="profile-no-videos">No clips uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} locked={!me?.is_premium} />
            ))}
          </div>
        )}
      </section>

      <UserListDialog
        open={!!listKind}
        onOpenChange={(o) => !o && setListKind(null)}
        title={listKind === "followers" ? `Followers of ${user.display_name || user.username}` : `${user.display_name || user.username} follows`}
        userId={user.id}
        kind={listKind || "followers"}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title={`Report @${user.username}`}
        endpoint={`/users/by-id/${user.id}/report`}
      />
    </div>
  );
};

export default Profile;
