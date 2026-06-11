import React from "react";
import { Link } from "react-router-dom";

export const UserAvatar = ({ user }) =>
  user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.display_name || user.username}
      className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0] bg-[#F1F5F9] shrink-0"
      onError={(e) => { e.target.style.display = "none"; }}
    />
  ) : (
    <div className="w-11 h-11 rounded-full bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center font-semibold shrink-0">
      {(user.display_name || user.username)?.[0]?.toUpperCase() || "?"}
    </div>
  );

const UserRow = ({ user, action, onNavigate }) => (
  <div className="flex items-center gap-3 py-3" data-testid={`user-row-${user.username}`}>
    <Link
      to={`/u/${user.username}`}
      onClick={onNavigate}
      className="flex items-center gap-3 flex-1 min-w-0 group"
    >
      <UserAvatar user={user} />
      <div className="min-w-0">
        <p className="font-semibold text-sm text-[#0F172A] truncate group-hover:text-[#2B8FCA] transition-colors">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-[#64748B] truncate">
          @{user.username}
          {user.followers_count != null && (
            <span className="text-[#94A3B8]"> · {user.followers_count} follower{user.followers_count === 1 ? "" : "s"}</span>
          )}
        </p>
        {user.bio && <p className="text-xs text-[#94A3B8] truncate mt-0.5">{user.bio}</p>}
      </div>
    </Link>
    {action}
  </div>
);

export default UserRow;
