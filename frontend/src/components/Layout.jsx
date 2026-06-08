import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Compass, Users, Upload, User as UserIcon, LogIn, LogOut, Crown, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const NavItem = ({ to, icon: Icon, label, testId }) => (
  <NavLink to={to} end={to === "/"} data-testid={testId} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
    <Icon size={18} strokeWidth={2} />
    <span>{label}</span>
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-[#1A1A1A] px-5 py-7 bg-[#0D0D0D]">
      <Link to="/" data-testid="logo-link" className="brand-mark text-2xl flex items-center gap-2 mb-10 text-white">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#E63946] text-white">
          <PlayCircle size={20} strokeWidth={2.5} />
        </span>
        <span className="lowercase tracking-tight">WeClips</span>
      </Link>

      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={Compass} label="Discover" testId="nav-discover" />
        <NavItem to="/following" icon={Users} label="Following" testId="nav-following" />
        <NavItem to="/upload" icon={Upload} label="Upload" testId="nav-upload" />
        {user && (
          <NavItem to={`/u/${user.username}`} icon={UserIcon} label="Profile" testId="nav-profile" />
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {!user?.is_premium && (
          <button
            data-testid="sidebar-subscribe-btn"
            onClick={() => navigate("/billing")}
            className="brand-cta rounded-md px-4 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <Crown size={15} /> Become a Member
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-3 pt-1">
            <div className="w-9 h-9 rounded-full bg-[#262626] text-white flex items-center justify-center font-semibold border border-[#333]">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white" data-testid="sidebar-username">@{user.username}</p>
              <p className="text-xs text-[#8C8C8C] truncate">{user.is_premium ? "Member" : "Free"}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              data-testid="sidebar-logout-btn"
              className="p-2 rounded-md text-[#8C8C8C] hover:bg-[#1A1A1A] hover:text-white"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/auth" data-testid="sidebar-login-link">
            <Button className="w-full bg-[#262626] hover:bg-[#333] text-white border border-[#333] rounded-md">
              <LogIn size={16} className="mr-2" /> Log in / Sign up
            </Button>
          </Link>
        )}
      </div>
    </aside>
  );
};

const MobileBottomNav = () => {
  const { user } = useAuth();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0D0D0D] border-t border-[#1A1A1A] flex items-center justify-around py-2 px-2">
      <NavLink to="/" end data-testid="mobile-nav-discover" className={({isActive}) => `flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
        <Compass size={20}/> Discover
      </NavLink>
      <NavLink to="/following" data-testid="mobile-nav-following" className={({isActive}) => `flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
        <Users size={20}/> Following
      </NavLink>
      <NavLink to="/upload" data-testid="mobile-nav-upload" className={({isActive}) => `flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
        <Upload size={20}/> Upload
      </NavLink>
      {user ? (
        <NavLink to={`/u/${user.username}`} data-testid="mobile-nav-profile" className={({isActive}) => `flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
          <UserIcon size={20}/> Profile
        </NavLink>
      ) : (
        <NavLink to="/auth" data-testid="mobile-nav-login" className={({isActive}) => `flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[11px] ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
          <LogIn size={20}/> Log in
        </NavLink>
      )}
    </nav>
  );
};

const MobileHeader = () => (
  <header className="lg:hidden sticky top-0 z-30 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-[#1A1A1A] px-4 py-3 flex items-center justify-between">
    <Link to="/" data-testid="mobile-logo" className="brand-mark text-xl flex items-center gap-2 text-white">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#E63946] text-white">
        <PlayCircle size={16} strokeWidth={2.5} />
      </span>
      WeClips
    </Link>
  </header>
);

const Layout = ({ children }) => (
  <div className="App flex min-h-screen bg-[#0D0D0D]">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <MobileHeader />
      <main className="flex-1 px-5 sm:px-8 lg:px-12 py-8 pb-24 lg:pb-12 max-w-[1600px] w-full mx-auto">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  </div>
);

export default Layout;
