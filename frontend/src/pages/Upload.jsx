import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, Lock, Crown, Film } from "lucide-react";

const MAX_MB = 2048;

const Upload = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [noAi, setNoAi] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB}MB (${(MAX_MB/1024).toFixed(0)}GB) limit`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please choose a video file");
    if (!title.trim()) return setError("Title is required");
    if (!noAi) return setError("Please confirm this is not AI-generated content");
    setError(null); setBusy(true); setProgress(0);

    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("file", file);

    try {
      const res = await api.post("/videos/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
        timeout: 0,
      });
      navigate(`/watch/${res.data.id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        setError("Membership required to upload. Become a member.");
      } else {
        setError(detail || err?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <p className="text-[#8C8C8C]">Loading…</p>;

  if (!user) {
    return (
      <div data-testid="upload-page-anon" className="max-w-xl mx-auto py-12 text-center">
        <h1 className="font-display text-4xl font-black tracking-tight text-white uppercase">Sign in to upload</h1>
        <p className="mt-2 text-[#B3B3B3]">Create an account to start sharing clips on WeClips.</p>
        <Link to="/auth"><Button className="mt-6 brand-cta">Log in / Sign up</Button></Link>
      </div>
    );
  }

  if (!user.is_premium) {
    return (
      <div data-testid="upload-page-paywall" className="max-w-xl mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-[#4D1317] text-[#FFD9DB] mb-4">
          <Lock size={28} />
        </div>
        <h1 className="font-display text-4xl font-black tracking-tight text-white uppercase">Become a Member to upload</h1>
        <p className="mt-2 text-[#B3B3B3]">WeClips uploads are part of the $0.99/month membership.</p>
        <Link to="/billing">
          <Button data-testid="paywall-subscribe-btn" className="mt-6 brand-cta px-6 h-11 rounded-md font-bold uppercase">
            <Crown size={16} className="mr-2"/> Become a Member · $0.99
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="upload-page" className="max-w-2xl mx-auto">
      <h1 className="font-display text-5xl font-black tracking-tight text-white uppercase">Upload a clip</h1>
      <p className="mt-2 text-[#B3B3B3]">Up to {MAX_MB} MB · mp4, webm, mov, ogg, mkv</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <Label htmlFor="title" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Title</Label>
          <Input id="title" data-testid="upload-title-input" required maxLength={200}
                 value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11 bg-[#1A1A1A] border-[#333] text-white" />
        </div>

        <div>
          <Label htmlFor="description" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Description (optional)</Label>
          <Textarea id="description" data-testid="upload-description-input" rows={4} maxLength={2000}
                    value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 bg-[#1A1A1A] border-[#333] text-white" />
        </div>

        <div>
          <Label htmlFor="file" className="text-[#B3B3B3] text-xs uppercase tracking-wider">Video file</Label>
          <label className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#333] rounded-md py-10 px-6 cursor-pointer hover:bg-[#1A1A1A] transition bg-[#0D0D0D]">
            <Film size={32} className="text-[#666]" />
            <span className="text-sm text-[#B3B3B3]">
              {file ? <span className="font-medium text-white">{file.name}</span> : "Click to choose a video"}
            </span>
            <span className="text-xs text-[#666]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `Max ${MAX_MB} MB`}</span>
            <input id="file" type="file" data-testid="upload-file-input" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm text-[#B3B3B3] cursor-pointer">
          <input
            type="checkbox" data-testid="upload-no-ai-checkbox"
            checked={noAi} onChange={(e) => setNoAi(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#E63946]"
          />
          <span>I confirm this clip is <span className="font-semibold text-white">not AI-generated</span> content.</span>
        </label>

        {error && <p className="text-sm text-[#E63946]" data-testid="upload-error">{error}</p>}

        {busy && (
          <div className="space-y-2" data-testid="upload-progress">
            <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div className="h-full bg-[#E63946] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-[#8C8C8C]">Uploading… {progress}%</p>
          </div>
        )}

        <Button type="submit" data-testid="upload-submit-btn" disabled={busy}
                className="h-11 brand-cta rounded-md font-bold uppercase tracking-wide px-6">
          <UploadIcon size={16} className="mr-2" /> {busy ? "Uploading…" : "Publish clip"}
        </Button>
      </form>
    </div>
  );
};

export default Upload;
