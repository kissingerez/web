import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API } from "@/lib/api";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import UserRow from "@/components/UserRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Camera, Trash2, Shield, FileText, Mail, AlertTriangle, CheckCircle2, UserX, LogOut,
} from "lucide-react";

const Section = ({ title, icon: Icon, children, testId }) => (
  <section data-testid={testId} className="bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-8">
    <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2 mb-6">
      {Icon && <Icon size={18} className="text-[#2B8FCA]" />} {title}
    </h2>
    {children}
  </section>
);

function resizeImageToDataUrl(file, max = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Invalid image")); };
    img.src = url;
  });
}

export default function Settings() {
  const { user, loading: authLoading, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [followersHidden, setFollowersHidden] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [config, setConfig] = useState(null);
  const [avatarBust, setAvatarBust] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    setDisplayName(user.display_name || "");
    setUsername(user.username || "");
    setBio(user.bio || "");
    setEmail(user.email || "");
    setFollowersHidden(!!user.followers_hidden);
    api.get("/users/me/blocks").then((r) => setBlocks(r.data)).catch(() => {});
    api.get("/config").then((r) => setConfig(r.data)).catch(() => {});
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return <p className="text-[#64748B]">Loading…</p>;

  const patchMe = async (payload, successMsg) => {
    setBusy(true);
    try {
      await api.patch("/auth/me", payload);
      await refreshMe();
      toast.success(successMsg);
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Update failed"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = () => {
    const payload = {};
    if (displayName.trim() && displayName.trim() !== user.display_name) payload.display_name = displayName.trim();
    if (username.trim() && username.trim() !== user.username) payload.username = username.trim();
    if (bio !== (user.bio || "")) payload.bio = bio;
    if (Object.keys(payload).length === 0) { toast.info("Nothing to save."); return; }
    patchMe(payload, "Profile updated").then((ok) => {
      if (ok && payload.username) navigate("/settings", { replace: true });
    });
  };

  const saveAccount = () => {
    const payload = {};
    if (email.trim() && email.trim() !== user.email) payload.email = email.trim();
    if (newPassword) {
      if (!currentPassword) { toast.error("Enter your current password to set a new one."); return; }
      payload.new_password = newPassword;
      payload.current_password = currentPassword;
    }
    if (Object.keys(payload).length === 0) { toast.info("Nothing to save."); return; }
    patchMe(payload, "Account updated").then((ok) => {
      if (ok) { setCurrentPassword(""); setNewPassword(""); }
    });
  };

  const toggleFollowersHidden = async (val) => {
    setFollowersHidden(val);
    const ok = await patchMe({ followers_hidden: val }, val ? "Followers list hidden" : "Followers list visible");
    if (!ok) setFollowersHidden(!val);
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await api.put("/auth/me/avatar", { avatar_base64: dataUrl });
      await refreshMe();
      setAvatarBust(Date.now());
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(errMsg(err, "Avatar upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const removeAvatar = async () => {
    setBusy(true);
    try {
      await api.delete("/auth/me/avatar");
      await refreshMe();
      setAvatarBust(Date.now());
      toast.success("Avatar removed");
    } catch (err) {
      toast.error(errMsg(err, "Could not remove avatar"));
    } finally {
      setBusy(false);
    }
  };

  const unblock = async (u) => {
    try {
      await api.delete(`/users/by-id/${u.id}/block`);
      setBlocks((bs) => bs.filter((b) => b.id !== u.id));
      toast.success(`Unblocked @${u.username}`);
    } catch (e) {
      toast.error(errMsg(e, "Could not unblock"));
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your WeClips account? Your profile and clips will be removed. This can only be undone by logging back in within the grace period.")) return;
    try {
      await api.delete("/auth/me");
      toast.success("Account scheduled for deletion.");
      logout();
      navigate("/");
    } catch (e) {
      toast.error(errMsg(e, "Could not delete account"));
    }
  };

  const avatarSrc = user.avatar_url ? `${user.avatar_url}?v=${avatarBust}` : null;

  return (
    <div data-testid="settings-page" className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl tracking-tight font-extrabold text-[#0F172A]">Settings</h1>
        <p className="mt-2 text-[#475569]">Manage your profile, account, privacy and membership.</p>
      </header>

      {/* Profile */}
      <Section title="Profile" icon={Camera} testId="settings-profile-section">
        <div className="flex items-center gap-5 mb-6">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-20 h-20 rounded-full object-cover border border-[#E2E8F0]" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#DCEEFB] border border-[#89CFF0] text-[#0A1929] flex items-center justify-center text-2xl font-bold">
              {(user.display_name || user.username)?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarFile} data-testid="avatar-file-input" />
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()} data-testid="avatar-upload-btn" className="rounded-md">
              <Camera size={15} className="mr-2" /> Change photo
            </Button>
            {user.avatar_url && (
              <Button variant="outline" disabled={busy} onClick={removeAvatar} data-testid="avatar-remove-btn" className="rounded-md text-[#DC2626]">
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} data-testid="settings-displayname-input" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">@</span>
              <Input id="username" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} data-testid="settings-username-input" className="pl-8" />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself…" data-testid="settings-bio-input" className="mt-1.5 min-h-[80px]" />
          </div>
          <Button onClick={saveProfile} disabled={busy} data-testid="settings-save-profile-btn" className="brand-cta rounded-md h-10 px-6 font-bold">
            Save profile
          </Button>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account" icon={Mail} testId="settings-account-section">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="settings-email-input" className="mt-1.5" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="settings-current-password-input" className="mt-1.5" placeholder="••••••••" />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="settings-new-password-input" className="mt-1.5" placeholder="Min 6 characters" />
            </div>
          </div>
          <Button onClick={saveAccount} disabled={busy} data-testid="settings-save-account-btn" className="brand-cta rounded-md h-10 px-6 font-bold">
            Save account
          </Button>
        </div>
      </Section>

      {/* Privacy & blocked */}
      <Section title="Privacy" icon={Shield} testId="settings-privacy-section">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm text-[#0F172A]">Hide my followers list</p>
            <p className="text-xs text-[#64748B] mt-0.5">Others won't see who follows you.</p>
          </div>
          <Switch checked={followersHidden} onCheckedChange={toggleFollowersHidden} data-testid="settings-followers-hidden-switch" />
        </div>
        <div className="mt-7">
          <p className="font-semibold text-sm text-[#0F172A] flex items-center gap-2"><UserX size={15}/> Blocked users</p>
          {blocks.length === 0 ? (
            <p className="text-xs text-[#64748B] mt-2" data-testid="settings-no-blocks">You haven't blocked anyone.</p>
          ) : (
            <div className="divide-y divide-[#F1F5F9] mt-2">
              {blocks.map((b) => (
                <UserRow key={b.id} user={b} action={
                  <Button size="sm" variant="outline" onClick={() => unblock(b)} data-testid={`unblock-btn-${b.username}`} className="rounded-md text-xs">
                    Unblock
                  </Button>
                } />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Membership */}
      <Section title="Membership" icon={CheckCircle2} testId="settings-membership-section">
        {user.is_premium ? (
          <div>
            <p className="text-sm text-[#0F172A]"><span className="brand-chip px-2 py-0.5 text-xs font-semibold rounded-md uppercase mr-2">Member</span> Your membership is active.</p>
            {user.premium_until && (
              <p className="text-xs text-[#64748B] mt-2">Current period ends {new Date(user.premium_until).toLocaleDateString()}.</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-[#475569]">You're not a member yet. Members can watch and upload clips.</p>
            <Button onClick={() => navigate("/billing")} data-testid="settings-subscribe-btn" className="brand-cta rounded-md h-10 px-5 font-bold">
              Become a Member · $0.99/mo
            </Button>
          </div>
        )}
      </Section>

      {/* Legal & support */}
      <Section title="About, Legal & Support" icon={FileText} testId="settings-legal-section">
        <p className="text-sm text-[#475569] mb-5">
          WeClips is an ad-free, Christian-friendly video network. $1/month. No AI. No chaos.
          By using WeClips you agree to our terms — uploads must be your own, human-made content.
        </p>
        <div className="flex flex-col gap-2.5 text-sm">
          <a href={`${API}/legal/terms`} target="_blank" rel="noreferrer" data-testid="settings-terms-link" className="text-[#2B8FCA] underline underline-offset-2">Terms of Service</a>
          <a href={`${API}/legal/privacy`} target="_blank" rel="noreferrer" data-testid="settings-privacy-link" className="text-[#2B8FCA] underline underline-offset-2">Privacy Policy</a>
          {config?.support_email && (
            <a href={`mailto:${config.support_email}`} data-testid="settings-support-link" className="text-[#2B8FCA] underline underline-offset-2">
              Contact support · {config.support_email}
            </a>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone" icon={AlertTriangle} testId="settings-danger-section">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => { logout(); navigate("/"); }} data-testid="settings-logout-btn" className="rounded-md">
            <LogOut size={15} className="mr-2" /> Log out
          </Button>
          <Button variant="outline" onClick={deleteAccount} data-testid="settings-delete-account-btn" className="rounded-md border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2]">
            <Trash2 size={15} className="mr-2" /> Delete account
          </Button>
        </div>
      </Section>
    </div>
  );
}
