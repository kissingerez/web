import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import UserRow from "@/components/UserRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const UserListDialog = ({ open, onOpenChange, title, userId, kind }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError(null);
    api.get(`/users/by-id/${userId}/${kind}`)
      .then((r) => setUsers(r.data))
      .catch((e) => setError(errMsg(e, "Could not load list")))
      .finally(() => setLoading(false));
  }, [open, userId, kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid={`${kind}-dialog`}>
        <DialogHeader>
          <DialogTitle className="text-[#0F172A]">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#F1F5F9] -mx-1 px-1">
          {loading && <p className="text-sm text-[#64748B] py-4">Loading…</p>}
          {!loading && error && <p className="text-sm text-[#DC2626] py-4">{error}</p>}
          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-[#64748B] py-4" data-testid={`${kind}-empty`}>No one here yet.</p>
          )}
          {!loading && users.map((u) => (
            <UserRow key={u.id} user={u} onNavigate={() => onOpenChange(false)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserListDialog;
