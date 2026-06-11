import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import UserRow from "@/components/UserRow";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, LogIn } from "lucide-react";

export default function Search() {
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Debounce input → URL param
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== q) setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setError(null);
    api.get("/users/search", { params: { q: q.trim() } })
      .then((r) => { setResults(r.data); setSearched(true); })
      .catch((e) => setError(errMsg(e, "Search failed")))
      .finally(() => setLoading(false));
  }, [q, user]);

  return (
    <div data-testid="search-page" className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl tracking-tight font-extrabold text-[#0F172A]">Search</h1>
        <p className="mt-2 text-[#475569]">Find creators and friends on WeClips.</p>
      </header>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name or username…"
          autoFocus
          data-testid="search-input"
          className="w-full h-12 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#89CFF0] focus:ring-2 focus:ring-[#DCEEFB]"
        />
      </div>

      {!authLoading && !user && (
        <div className="text-center py-12 border border-dashed border-[#CBD5E1] rounded-lg" data-testid="search-login-prompt">
          <p className="text-[#0F172A] font-semibold">Log in to search</p>
          <p className="text-sm text-[#64748B] mt-1 mb-4">You need an account to find other members.</p>
          <Link to="/auth">
            <Button className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-md">
              <LogIn size={15} className="mr-2"/> Log in / Sign up
            </Button>
          </Link>
        </div>
      )}

      {user && (
        <div className="divide-y divide-[#F1F5F9]" data-testid="search-results">
          {loading && <p className="text-sm text-[#64748B] py-4">Searching…</p>}
          {!loading && error && <p className="text-sm text-[#DC2626] py-4">{error}</p>}
          {!loading && !error && searched && results.length === 0 && (
            <p className="text-sm text-[#64748B] py-4" data-testid="search-no-results">
              No users found for “{q}”.
            </p>
          )}
          {!loading && results.map((u) => <UserRow key={u.id} user={u} />)}
        </div>
      )}
    </div>
  );
}
