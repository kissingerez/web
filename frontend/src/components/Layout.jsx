import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Compass, Users, Upload, User as UserIcon, LogIn, LogOut, CheckCircle2,
  Search as SearchIcon, Bell, Settings as SettingsIcon, Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api, { API } from "@/lib/api";
import { Button } from "@/components/ui/button";

const NavItem = ({ to, icon: Icon, label, testId, badge }) => (
  <NavLink to={to} end={to === "/"} data-testid={testId} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
    <span className="relative">
      <Icon size={18} strokeWidth={2} />
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center" data-testid={`${testId}-badge`}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
    <span>{label}</span>
  </NavLink>
);

const LegalLinks = () => (
  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
    <a href={`${API}/legal/terms`} target="_blank" rel="noreferrer" data-testid="footer-terms-link" className="hover:text-[#475569] underline-offset-2 hover:underline">Terms</a>
    {" · "}
    <a href={`${API}/legal/privacy`} target="_blank" rel="noreferrer" data-testid="footer-privacy-link" className="hover:text-[#475569] underline-offset-2 hover:underline">Privacy</a>
    {" · "}
    <a href="mailto:support@weclips.app" data-testid="footer-support-link" className="hover:text-[#475569] underline-offset-2 hover:underline">Support</a>
  </p>
);

const Sidebar = ({ unread }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-[#E2E8F0] px-5 py-7 bg-white">
      <Link to="/" data-testid="logo-link" className="brand-mark text-3xl mb-10 text-[#89CFF0] hover:text-[#74C4ED] transition-colors">
        WeClips
      </Link>

      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={Compass} label="Discover" testId="nav-discover" />
        <NavItem to="/search" icon={SearchIcon} label="Search" testId="nav-search" />
        <NavItem to="/following" icon={Users} label="Following" testId="nav-following" />
        <NavItem to="/upload" icon={Upload} label="Upload" testId="nav-upload" />
        {user && <NavItem to="/notifications" icon={Bell} label="Notifications" testId="nav-notifications" badge={unread} />}
        {user && <NavItem to={`/u/${user.username}`} icon={UserIcon} label="Profile" testId="nav-profile" />}
        {user && <NavItem to="/settings" icon={SettingsIcon} label="Settings" testId="nav-settings" />}
        {user?.is_founder && <NavItem to="/admin" icon={Shield} label="Moderation" testId="nav-admin" />}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        {!user?.is_premium && (
          <button
            data-testid="sidebar-subscribe-btn"
            onClick={() => navigate("/billing")}
            className="brand-cta rounded-md px-4 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={15} /> Try free for 7 days
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-3 pt-1">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name || user.username}
                   className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] bg-[#F1F5F9]"
                   onError={(e) => { e.target.style.display = "none"; }}/>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#DCEEFB] text-[#0A1929] flex items-center justify-center font-semibold border border-[#89CFF0]">
                {(user.display_name || user.username)?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[#0F172A]" data-testid="sidebar-username">
                {user.display_name || user.username}
              </p>
              <p className="text-xs text-[#64748B] truncate">@{user.username}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              data-testid="sidebar-logout-btn"
              className="p-2 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/auth" data-testid="sidebar-login-link">
            <Button className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-md">
              <LogIn size={16} className="mr-2" /> Log in / Sign up
            </Button>
          </Link>
        )}
        <LegalLinks />
      </div>
    </aside>
  );
};

const MobileBottomNav = () => {
  const { user } = useAuth();
  const itemCls = ({ isActive }) => `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-md text-[11px] ${isActive ? "text-[#0B5C8C]" : "text-[#64748B]"}`;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E2E8F0] flex items-center justify-around py-2 px-1">
      <NavLink to="/" end data-testid="mobile-nav-discover" className={itemCls}>
        <Compass size={20}/> Discover
      </NavLink>
      <NavLink to="/upload" data-testid="mobile-nav-upload" className={itemCls}>
        <Upload size={20}/> Upload
      </NavLink>
      <NavLink to="/following" data-testid="mobile-nav-following" className={itemCls}>
        <Users size={20}/> Following
      </NavLink>
      {user?.is_founder && (
        <NavLink to="/admin" data-testid="mobile-nav-admin" className={itemCls}>
          <Shield size={20}/> Mod
        </NavLink>
      )}
      {user ? (
        <NavLink to={`/u/${user.username}`} data-testid="mobile-nav-profile" className={itemCls}>
          <UserIcon size={20}/> Profile
        </NavLink>
      ) : (
        <NavLink to="/auth" data-testid="mobile-nav-login" className={itemCls}>
          <LogIn size={20}/> Log in
        </NavLink>
      )}
    </nav>
  );
};

const MobileHeader = ({ unread }) => {
  const { user } = useAuth();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
      <Link to="/" data-testid="mobile-logo" className="brand-mark text-2xl text-[#89CFF0]">
        WeClips
      </Link>
      {user && (
        <div className="flex items-center gap-1">
          <Link to="/notifications" data-testid="mobile-notifications-link" className="relative p-2 rounded-md text-[#64748B] hover:bg-[#F1F5F9]">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link to="/settings" data-testid="mobile-settings-link" className="p-2 rounded-md text-[#64748B] hover:bg-[#F1F5F9]">
            <SettingsIcon size={20} />
          </Link>
        </div>
      )}
    </header>
  );
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    api.get("/notifications/unread-count")
      .then((r) => setUnread(r.data?.count || 0))
      .catch(() => {});
  }, [user, location.pathname]);

  return (
    <div className="App flex min-h-screen bg-white">
      <Sidebar unread={unread} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader unread={unread} />
        <main className="flex-1 px-5 sm:px-8 lg:px-12 py-8 pb-24 lg:pb-12 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Layout;
