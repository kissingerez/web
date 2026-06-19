import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { errMsg, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, MessageCircle, Send } from "lucide-react";

const Comments = ({ videoId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.get(`/videos/${videoId}/comments`)
      .then((r) => { setComments(r.data); setMembersOnly(false); setError(null); })
      .catch((e) => {
        if (e?.response?.status === 402 || e?.response?.status === 403) setMembersOnly(true);
        else setError(errMsg(e, "Could not load comments"));
      });
  }, [videoId]);

  useEffect(load, [load]);

  const post = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await api.post(`/videos/${videoId}/comments`, { text: t });
      setText("");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Could not post comment"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId) => {
    try {
      await api.delete(`/videos/${videoId}/comments/${commentId}`);
      setComments((cs) => cs.filter((c) => c.id !== commentId));
    } catch (e) {
      toast.error(errMsg(e, "Could not delete comment"));
    }
  };

  const toggleLike = async (commentId) => {
    try {
      const r = await api.post(`/videos/${videoId}/comments/${commentId}/like`);
      setComments((cs) => cs.map((c) => c.id === commentId
        ? { ...c, liked: r.data?.liked ?? !c.liked, likes: r.data?.likes ?? c.likes }
        : c));
    } catch (e) {
      toast.error(errMsg(e, "Could not like comment"));
    }
  };

  if (membersOnly) {
    return (
      <section className="mt-10" data-testid="comments-members-only">
        <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2 mb-3">
          <MessageCircle size={18}/> Comments
        </h2>
        <p className="text-sm text-[#64748B]">
          Comments are for members. <Link to="/billing" className="text-[#2B8FCA] underline">Start free trial</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10" data-testid="comments-section">
      <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2 mb-5">
        <MessageCircle size={18}/> Comments <span className="text-[#94A3B8] font-medium text-base">({comments.length})</span>
      </h2>

      {user ? (
        <div className="flex gap-3 mb-7">
          <div className="w-9 h-9 rounded-full bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center text-sm font-semibold shrink-0">
            {(user.display_name || user.username)?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
              maxLength={500}
              placeholder="Add a comment…"
              data-testid="comment-input"
              className="flex-1 h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#89CFF0]"
            />
            <Button onClick={post} disabled={busy || !text.trim()} data-testid="comment-post-btn"
                    className="brand-cta h-10 rounded-md px-4">
              <Send size={15}/>
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#64748B] mb-6">
          <Link to="/auth" className="text-[#2B8FCA] underline">Log in</Link> to join the conversation.
        </p>
      )}

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
      {!error && comments.length === 0 && (
        <p className="text-sm text-[#94A3B8]" data-testid="comments-empty">No comments yet. Be the first!</p>
      )}

      <ul className="space-y-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] flex items-center justify-center text-sm font-semibold shrink-0">
              {c.user_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <Link to={`/p/${c.user_id}`} data-testid={`comment-author-${c.id}`} className="font-semibold text-[#0F172A] hover:text-[#2B8FCA] hover:underline underline-offset-2">
                  {c.user_name}
                </Link>
                <span className="text-xs text-[#94A3B8] ml-2">{timeAgo(c.created_at)}</span>
              </p>
              <p className="text-sm text-[#475569] mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
              <div className="flex items-center gap-4 mt-1.5">
                <button
                  onClick={() => toggleLike(c.id)}
                  data-testid={`comment-like-btn-${c.id}`}
                  className={`inline-flex items-center gap-1 text-xs ${c.liked ? "text-[#DC2626]" : "text-[#94A3B8] hover:text-[#DC2626]"}`}
                >
                  <Heart size={13} fill={c.liked ? "currentColor" : "none"}/> {c.likes || 0}
                </button>
                {user?.id === c.user_id && (
                  <button
                    onClick={() => remove(c.id)}
                    data-testid={`comment-delete-btn-${c.id}`}
                    className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#DC2626]"
                  >
                    <Trash2 size={13}/> Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Comments;
