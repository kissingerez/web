import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Compass, Users, Upload, User as UserIcon, LogIn, LogOut, Sparkles, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const NavItem = ({ to, icon: Icon, label, testId }) => (
  <NavLink to={to} data-testid={testId} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
    <Icon size={18} strokeWidth={2} />
    <span>{label}</span>
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-slate-200 px-5 py-7">
      <Link to="/" data-testid="logo-link" className="brand-mark text-2xl flex items-center gap-2 mb-10">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#ff3b30] text-white">
          <PlayCircle size={20} />
        </span>
        slate
      </Link>

      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={Compass} label="Discover" testId="nav-discover" />
        <NavItem to="/following" icon={Users} label="Following" testId="nav-following" />
        <NavItem to="/upload" icon={Upload} label="Upload" testId="nav-upload" />
        {user && (
          <NavItem to={`/u/${user.username}`} icon={UserIcon} label="Profile" testId="nav-profile" />
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {!user?.is_premium && (
          <button
            data-testid="sidebar-subscribe-btn"
            onClick={() => navigate("/billing")}
            className="gold-shimmer text-white rounded-lg px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95"
          >
            <Sparkles size={16} /> Subscribe · $0.99
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="sidebar-username">@{user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.is_premium ? "Premium" : "Free"}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              data-testid="sidebar-logout-btn"
              className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link to="/auth" data-testid="sidebar-login-link">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg">
              <LogIn size={16} className="mr-2" /> Log in / Sign up
            </Button>
          </Link>
        )}
      </div>
    </aside>
  );
};

const MobileNav = () => {
  const { user } = useAuth();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <Link to="/" data-testid="mobile-logo" className="brand-mark text-xl flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#ff3b30] text-white">
          <PlayCircle size={16} />
        </span>
        slate
      </Link>
      <nav className="flex items-center gap-1 text-slate-500">
        <NavLink to="/" data-testid="mobile-nav-discover" className={({isActive}) => `p-2 rounded-md ${isActive ? "text-slate-900 bg-slate-100" : ""}`}><Compass size={20}/></NavLink>
        <NavLink to="/following" data-testid="mobile-nav-following" className={({isActive}) => `p-2 rounded-md ${isActive ? "text-slate-900 bg-slate-100" : ""}`}><Users size={20}/></NavLink>
        <NavLink to="/upload" data-testid="mobile-nav-upload" className={({isActive}) => `p-2 rounded-md ${isActive ? "text-slate-900 bg-slate-100" : ""}`}><Upload size={20}/></NavLink>
        {user ? (
          <NavLink to={`/u/${user.username}`} data-testid="mobile-nav-profile" className={({isActive}) => `p-2 rounded-md ${isActive ? "text-slate-900 bg-slate-100" : ""}`}><UserIcon size={20}/></NavLink>
        ) : (
          <NavLink to="/auth" data-testid="mobile-nav-login" className={({isActive}) => `p-2 rounded-md ${isActive ? "text-slate-900 bg-slate-100" : ""}`}><LogIn size={20}/></NavLink>
        )}
      </nav>
    </header>
  );
};

const Layout = ({ children }) => (
  <div className="App flex min-h-screen bg-white">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <MobileNav />
      <main className="flex-1 px-5 sm:px-8 lg:px-12 py-8 max-w-[1600px] w-full mx-auto">
        {children}
      </main>
    </div>
  </div>
);

export default Layout;
