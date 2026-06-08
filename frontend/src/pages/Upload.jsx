import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, Lock, Sparkles, Film } from "lucide-react";

const Upload = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > 100 * 1024 * 1024) {
      setError("File exceeds 100MB limit");
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
        setError("Premium subscription required to upload. Please subscribe.");
      } else {
        setError(detail || err?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <p className="text-slate-500">Loading…</p>;

  if (!user) {
    return (
      <div data-testid="upload-page-anon" className="max-w-xl mx-auto py-12 text-center">
        <h1 className="text-3xl font-black tracking-tight">Sign in to upload</h1>
        <p className="mt-2 text-slate-500">Create an account to start sharing videos on slate.</p>
        <Link to="/auth"><Button className="mt-6 bg-slate-900 hover:bg-slate-800 text-white">Log in / Sign up</Button></Link>
      </div>
    );
  }

  if (!user.is_premium) {
    return (
      <div data-testid="upload-page-paywall" className="max-w-xl mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <Lock size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Subscribe to upload</h1>
        <p className="mt-2 text-slate-500">Slate uploads are part of the $0.99/month membership.</p>
        <Link to="/billing">
          <Button data-testid="paywall-subscribe-btn" className="mt-6 gold-shimmer text-white px-6 h-11 rounded-lg font-semibold">
            <Sparkles size={16} className="mr-2"/> Subscribe for $0.99
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="upload-page" className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-black tracking-tighter text-slate-900">Upload a video</h1>
      <p className="mt-2 text-slate-500">Up to 100MB · mp4, webm, mov, ogg</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <Label htmlFor="title" className="text-slate-700">Title</Label>
          <Input id="title" data-testid="upload-title-input" required maxLength={200}
                 value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11" />
        </div>

        <div>
          <Label htmlFor="description" className="text-slate-700">Description (optional)</Label>
          <Textarea id="description" data-testid="upload-description-input" rows={4} maxLength={2000}
                    value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="file" className="text-slate-700">Video file</Label>
          <label className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-10 px-6 cursor-pointer hover:bg-slate-50 transition">
            <Film size={32} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              {file ? <span className="font-medium text-slate-900">{file.name}</span> : "Click to choose a video"}
            </span>
            <span className="text-xs text-slate-400">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Max 100 MB"}</span>
            <input id="file" type="file" data-testid="upload-file-input" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {error && <p className="text-sm text-red-600" data-testid="upload-error">{error}</p>}

        {busy && (
          <div className="space-y-2" data-testid="upload-progress">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#ff3b30] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500">Uploading… {progress}%</p>
          </div>
        )}

        <Button type="submit" data-testid="upload-submit-btn" disabled={busy}
                className="h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold px-6">
          <UploadIcon size={16} className="mr-2" /> {busy ? "Uploading…" : "Publish video"}
        </Button>
      </form>
    </div>
  );
};

export default Upload;
