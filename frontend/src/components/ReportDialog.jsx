import React, { useState } from "react";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

const ReportDialog = ({ open, onOpenChange, title, endpoint }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 2) {
      toast.error("Please describe the issue (at least a few words).");
      return;
    }
    setBusy(true);
    try {
      await api.post(endpoint, { reason: reason.trim() });
      toast.success("Report submitted. Our team will review it.");
      setReason("");
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e, "Could not submit report"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="report-dialog">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] flex items-center gap-2"><Flag size={16}/> {title}</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Reports are reviewed by the WeClips team.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Describe the issue…"
          data-testid="report-reason-input"
          className="min-h-[100px]"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-md">Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="report-submit-btn"
                  className="bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md">
            {busy ? "Sending…" : "Submit report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
