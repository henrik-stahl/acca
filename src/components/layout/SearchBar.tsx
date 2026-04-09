"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, CalendarDays, BookUser } from "lucide-react";

type ResultType = "submission" | "event" | "contact";

type Result = {
  type: ResultType;
  id: string;
  href: string;
  label: string;
  sublabel: string;
};

const TYPE_ICONS: Record<ResultType, React.ElementType> = {
  submission: FileText,
  event: CalendarDays,
  contact: BookUser,
};

const TYPE_LABELS: Record<ResultType, string> = {
  submission: "Submission",
  event: "Event",
  contact: "Contact",
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [allData, setAllData] = useState<{
    submissions: any[];
    events: any[];
    contacts: any[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch all data once on first focus
  async function loadData() {
    if (allData || loading) return;
    setLoading(true);
    const [submissions, events, contacts] = await Promise.all([
      fetch("/api/submissions").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]);
    setAllData({ submissions, events, contacts });
    setLoading(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Build filtered results
  const results: Result[] = [];
  if (allData && query.trim().length >= 2) {
    const q = query.toLowerCase();

    for (const s of allData.submissions) {
      const name = `${s.accredited?.firstName ?? ""} ${s.accredited?.lastName ?? ""}`.toLowerCase();
      const eventName = s.event?.eventName?.toLowerCase() ?? "";
      const company = s.company?.toLowerCase() ?? "";
      const sid = s.submissionId?.toLowerCase() ?? "";
      if (name.includes(q) || eventName.includes(q) || company.includes(q) || sid.includes(q)) {
        results.push({
          type: "submission",
          id: s.submissionId,
          href: `/submissions?id=${s.submissionId}`,
          label: `${s.accredited?.firstName ?? ""} ${s.accredited?.lastName ?? ""}`.trim() || "—",
          sublabel: s.event?.eventName ?? "—",
        });
      }
    }

    for (const e of allData.events) {
      const name = e.eventName?.toLowerCase() ?? "";
      const competition = e.competition?.toLowerCase() ?? "";
      const eid = e.eventId?.toLowerCase() ?? "";
      if (name.includes(q) || competition.includes(q) || eid.includes(q)) {
        results.push({
          type: "event",
          id: e.eventId,
          href: `/events?id=${e.eventId}`,
          label: e.eventName ?? "—",
          sublabel: e.competition ?? "—",
        });
      }
    }

    for (const c of allData.contacts) {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const company = c.company?.toLowerCase() ?? "";
      const email = c.email?.toLowerCase() ?? "";
      const cid = c.contactId?.toLowerCase() ?? "";
      if (name.includes(q) || company.includes(q) || email.includes(q) || cid.includes(q)) {
        results.push({
          type: "contact",
          id: c.contactId,
          href: `/contacts?id=${c.contactId}`,
          label: `${c.firstName} ${c.lastName}`.trim() || "—",
          sublabel: c.company ?? c.email ?? "—",
        });
      }
    }
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      navigate(results[activeIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center gap-3">
      <Search size={18} className="text-gray-400 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          loadData();
          if (query.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setOpen(false); }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul>
              {results.map((r, i) => {
                const Icon = TYPE_ICONS[r.type];
                return (
                  <li
                    key={`${r.type}-${r.id}`}
                    onMouseDown={() => navigate(r.href)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      i === activeIndex ? "bg-sage-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={14} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900">{r.label}</span>
                      <span className="text-xs text-gray-400 ml-2 truncate">{r.sublabel}</span>
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0">
                      {TYPE_LABELS[r.type]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
