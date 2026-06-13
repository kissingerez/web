import React, { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, Lock, CheckCircle2 as Crown, Film } from "lucide-react";

const MAX_GB = 25;
const MAX_BYTES = MAX_GB * 1024 * 1024 * 1024;
const MAX_MINUTES = 180;

const fmtBytes = (b) => {
  if (!b || b < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const fmtSpeed = (bps) => {
  if (!bps || bps < 1) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bps) / Math.log(1024)));
  return `${(bps / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const fmtEta = (sec) => {
  if (sec == null || !isFinite(sec)) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm.toString().padStart(2, "0")}m`;
};

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
  const [speedBps, setSpeedBps] = useState(0);
  const [etaSec, setEtaSec] = useState(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  // rolling window for accurate speed: keep last ~2s of (t, loaded) samples
  const samplesRef = useRef([]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) {
      setError(`File exceeds the ${MAX_GB}GB limit`);
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
    setSpeedBps(0); setEtaSec(null); setUploadedBytes(0); setTotalBytes(file.size);
    samplesRef.current = [{ t: performance.now(), loaded: 0 }];

    try {
      // Get the direct upload target (the mobile/canonical backend). This lets
      // the browser bypass our web ingress' body-size limit on big clips.
      const { data: target } = await api.get("/config/upload-target");
      const uploadUrl = target?.url;
      if (!uploadUrl) throw new Error("Upload service unavailable");

      const fd = new FormData();
      fd.append("title", title.trim().slice(0, 120));
      fd.append("description", (description || "").trim().slice(0, 2000));
      fd.append("mime_type", file.type || "video/mp4");
      fd.append("no_ai_confirmed", "true");
      fd.append("file", file, file.name || "video.mp4");

      const token = localStorage.getItem("slate_token");
      const res = await axios.post(uploadUrl, fd, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (e) => {
          const total = e.total || file.size;
          setTotalBytes(total);
          setUploadedBytes(e.loaded);
          if (total) setProgress(Math.round((e.loaded / total) * 100));

          // rolling-window MB/s + ETA (last 2s of samples)
          const now = performance.now();
          const samples = samplesRef.current;
          samples.push({ t: now, loaded: e.loaded });
          while (samples.length > 2 && now - samples[0].t > 2000) samples.shift();
          const first = samples[0];
          const dt = (now - first.t) / 1000;
          const dl = e.loaded - first.loaded;
          if (dt > 0.25 && dl > 0) {
            const bps = dl / dt;
            setSpeedBps(bps);
            const remaining = total - e.loaded;
            setEtaSec(bps > 0 ? Math.max(0, Math.round(remaining / bps)) : null);
          }
        },
        timeout: 0,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const id = res?.data?.id;
      if (id) navigate(`/watch/${id}`);
      else throw new Error("Upload finished but no clip id returned");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status === 402) {
        setError("Membership required to upload. Become a member.");
      } else if (status === 413) {
        setError("That file is too large for the upload service.");
      } else {
        setError(detail || err?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <p className="text-[#64748B]">Loading…</p>;

  if (!user) {
    return (
      <div data-testid="upload-page-anon" className="max-w-xl mx-auto py-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Sign in to upload</h1>
        <p className="mt-2 text-[#475569]">Create an account to start sharing clips on WeClips.</p>
        <Link to="/auth"><Button className="mt-6 brand-cta">Log in / Sign up</Button></Link>
      </div>
    );
  }

  if (!user.is_premium) {
    return (
      <div data-testid="upload-page-paywall" className="max-w-xl mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-[#DCEEFB] text-[#0B5C8C] mb-4">
          <Lock size={28} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Become a Member to upload</h1>
        <p className="mt-2 text-[#475569]">WeClips uploads are part of the $0.99/month membership.</p>
        <Link to="/billing">
          <Button data-testid="paywall-subscribe-btn" className="mt-6 brand-cta px-6 h-11 rounded-md font-bold">
            <Crown size={16} className="mr-2"/> Become a Member · $0.99
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="upload-page" className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Upload a clip</h1>
      <p className="mt-2 text-[#475569]">Up to {MAX_GB} GB · up to {MAX_MINUTES} minutes · mp4, webm, mov, ogg, mkv</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <Label htmlFor="title" className="text-[#475569] text-xs uppercase tracking-wider">Title</Label>
          <Input id="title" data-testid="upload-title-input" required maxLength={200}
                 value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11 bg-white border-[#E2E8F0] text-[#0F172A]" />
        </div>

        <div>
          <Label htmlFor="description" className="text-[#475569] text-xs uppercase tracking-wider">Description (optional)</Label>
          <Textarea id="description" data-testid="upload-description-input" rows={4} maxLength={2000}
                    value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 bg-white border-[#E2E8F0] text-[#0F172A]" />
        </div>

        <div>
          <Label htmlFor="file" className="text-[#475569] text-xs uppercase tracking-wider">Video file</Label>
          <label className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#CBD5E1] rounded-lg py-10 px-6 cursor-pointer hover:bg-[#F8FAFC] transition bg-white">
            <Film size={32} className="text-[#94A3B8]" />
            <span className="text-sm text-[#475569]">
              {file ? <span className="font-medium text-[#0F172A]">{file.name}</span> : "Click to choose a video"}
            </span>
            <span className="text-xs text-[#94A3B8]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `Max ${MAX_GB} GB / ${MAX_MINUTES} min`}</span>
            <input id="file" type="file" data-testid="upload-file-input" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm text-[#475569] cursor-pointer">
          <input
            type="checkbox" data-testid="upload-no-ai-checkbox"
            checked={noAi} onChange={(e) => setNoAi(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#89CFF0]"
          />
          <span>I confirm this clip is <span className="font-semibold text-[#0F172A]">not AI-generated</span> content.</span>
        </label>

        {error && <p className="text-sm text-[#DC2626]" data-testid="upload-error">{error}</p>}

        {busy && (
          <div className="space-y-2" data-testid="upload-progress">
            <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#89CFF0] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[#64748B]">
              <span data-testid="upload-progress-pct">Uploading… {progress}%</span>
              <span data-testid="upload-progress-bytes">{fmtBytes(uploadedBytes)} / {fmtBytes(totalBytes)}</span>
              <span data-testid="upload-progress-speed">{speedBps > 0 ? `${fmtSpeed(speedBps)}` : "—"}</span>
              <span data-testid="upload-progress-eta">{etaSec != null ? `ETA ${fmtEta(etaSec)}` : ""}</span>
            </div>
          </div>
        )}

        <Button type="submit" data-testid="upload-submit-btn" disabled={busy}
                className="h-11 brand-cta rounded-md font-bold px-6">
          <UploadIcon size={16} className="mr-2" /> {busy ? "Uploading…" : "Publish clip"}
        </Button>
      </form>
    </div>
  );
};

export default Upload;
