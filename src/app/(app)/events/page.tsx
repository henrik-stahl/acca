"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import EventCard from "@/components/events/EventCard";
import EventDrawer from "@/components/events/EventDrawer";
import { COMPETITIONS, cn, formatDate } from "@/lib/utils";
import type { Event, Submission } from "@prisma/client";

export type EventWithSubmissions = Event & {
  submissions: Array<Pick<Submission, "status" | "category" | "assignedSeat" | "attended">>;
  _count: { submissions: number };
};

type SortKey = "eventId" | "eventName" | "eventDate" | "competition" | "arena" | "total" | "approved" | "rejected" | "unanswered" | "attended" | "pressSeats" | "photoPit";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-gray-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-gray-600 ml-1 inline" />;
}

function EventsPageInner() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);

  // Past events filters
  const [nameFilter, setNameFilter] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("");
  const [arenaFilter, setArenaFilter] = useState("");

  // Sort (past events table)
  const [sortKey, setSortKey] = useState<SortKey>("eventDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    eventName: "", eventDate: "", eventTime: "18:00", competition: "", arena: "",
    pressSeatsCapacity: "60", photoPitCapacity: "30", cmsEventId: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => { setEvents(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const e = events.find((e) => e.eventId === id);
      if (e) setSelectedId(e.id);
    }
  }, [searchParams, events]);

  const now = new Date();

  const upcoming = useMemo(() =>
    events.filter((e) => new Date(e.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    [events]
  );

  // Past events with derived stats
  const pastWithStats = useMemo(() =>
    events
      .filter((e) => new Date(e.eventDate) < now)
      .map((e) => ({
        ...e,
        total: e.submissions.length,
        approved: e.submissions.filter((s) => s.status === "Approved").length,
        rejected: e.submissions.filter((s) => s.status === "Rejected").length,
        unanswered: e.submissions.filter((s) => s.status === "Pending" || s.status === "Info requested").length,
        attendedCount: e.submissions.filter((s) => s.attended).length,
        pressApproved: e.submissions.filter((s) => s.status === "Approved" && s.assignedSeat !== "Photo pit").length,
        pitApproved: e.submissions.filter((s) => s.status === "Approved" && s.assignedSeat === "Photo pit").length,
      })),
    [events]
  );

  const filteredPast = useMemo(() =>
    pastWithStats.filter((e) => {
      if (nameFilter && !e.eventName.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (competitionFilter && e.competition !== competitionFilter) return false;
      if (arenaFilter && (e.arena ?? "") !== arenaFilter) return false;
      return true;
    }),
    [pastWithStats, nameFilter, competitionFilter, arenaFilter]
  );

  const sortedPast = useMemo(() => [...filteredPast].sort((a, b) => {
    let av: string | number | Date = "";
    let bv: string | number | Date = "";
    switch (sortKey) {
      case "eventId":     av = a.eventId;     bv = b.eventId;     break;
      case "eventName":   av = a.eventName;   bv = b.eventName;   break;
      case "eventDate":   av = new Date(a.eventDate); bv = new Date(b.eventDate); break;
      case "competition": av = a.competition; bv = b.competition; break;
      case "arena":       av = a.arena ?? ""; bv = b.arena ?? ""; break;
      case "total":       av = a.total;       bv = b.total;       break;
      case "approved":    av = a.approved;    bv = b.approved;    break;
      case "rejected":    av = a.rejected;    bv = b.rejected;    break;
      case "unanswered":  av = a.unanswered;  bv = b.unanswered;  break;
      case "attended":    av = a.attendedCount; bv = b.attendedCount; break;
      case "pressSeats":  av = a.pressSeatsCapacity ?? 0; bv = b.pressSeatsCapacity ?? 0; break;
      case "photoPit":    av = a.photoPitCapacity ?? 0;   bv = b.photoPitCapacity ?? 0;   break;
    }
    let cmp = 0;
    if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
    else if (typeof av === "number") cmp = av - (bv as number);
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  }), [filteredPast, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function exportCsv() {
    const headers = ["Event ID", "Event name", "Date", "Competition", "Arena", "Submissions", "Approved", "Rejected", "Unanswered", "Attendees", "Press seats", "Photo pit"];
    const rows = sortedPast.map((e) => [
      e.eventId, e.eventName,
      formatDate(e.eventDate, true),
      e.competition, e.arena ?? "",
      e.total, e.approved, e.rejected, e.unanswered, e.attendedCount,
      e.pressSeatsCapacity ?? "", e.photoPitCapacity ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "past-events.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAdd() {
    setAddSaving(true);
    const { eventTime, cmsEventId, ...rest } = addForm;
    const eventDate = new Date(`${rest.eventDate}T${eventTime}`).toISOString();
    const body: Record<string, unknown> = { ...rest, eventDate };
    if (cmsEventId.trim()) body.cmsEventId = cmsEventId.trim();
    const res = await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    setEvents((prev) => [...prev, { ...created, submissions: [], _count: { submissions: 0 } }]);
    setAddModal(false);
    setAddSaving(false);
    setAddForm({ eventName: "", eventDate: "", eventTime: "18:00", competition: "", arena: "", pressSeatsCapacity: "60", photoPitCapacity: "30", cmsEventId: "" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
  }

  const selected = events.find((e) => e.id === selectedId || e.eventId === selectedId) ?? null;
  const arenas = useMemo(() => Array.from(new Set(pastWithStats.map((e) => e.arena).filter(Boolean))) as string[], [pastWithStats]);
  const hasFilters = nameFilter || competitionFilter || arenaFilter;

  const thClass = "px-3 py-2 text-left text-xs font-fg-book-cmpr uppercase tracking-wide text-gray-500 whitespace-nowrap select-none cursor-pointer hover:text-gray-800";
  const selectClass = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 bg-white";

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-4 pb-4">

      {/* ── Upcoming events ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Upcoming events
            {upcoming.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">{upcoming.length}</span>
            )}
          </h1>
          <Button size="sm" variant="primary" onClick={() => setAddModal(true)}>
            <Plus size={14} /> Add event
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                onClick={() => setSelectedId(e.id)}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Past events ── */}
      <div className="bg-white rounded-2xl shadow-sm pb-6">
        {/* Title row */}
        <div className="flex items-center justify-between px-6 pt-6 pb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Past events
            <span className="ml-2 text-sm font-normal text-gray-400">{sortedPast.length}</span>
          </h2>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-6 pb-3 border-b border-gray-100 flex-wrap">
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Name…"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 w-36"
          />
          <select value={competitionFilter} onChange={(e) => setCompetitionFilter(e.target.value)} className={selectClass}>
            <option value="">All competitions</option>
            {COMPETITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={arenaFilter} onChange={(e) => setArenaFilter(e.target.value)} className={selectClass}>
            <option value="">All arenas</option>
            {arenas.map((a) => <option key={a}>{a}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setNameFilter(""); setCompetitionFilter(""); setArenaFilter(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {([
                  ["eventId",     "Event ID"],
                  ["eventName",   "Event name"],
                  ["eventDate",   "Date"],
                  ["competition", "Competition"],
                  ["arena",       "Arena"],
                  ["total",       "Submissions"],
                  ["approved",    "Approved"],
                  ["rejected",    "Rejected"],
                  ["unanswered",  "Unanswered"],
                  ["attended",    "Attendees"],
                  ["pressSeats",  "Press seats"],
                  ["photoPit",    "Photo pit"],
                ] as [SortKey, string][]).map(([key, label], i, arr) => (
                  <th
                    key={key}
                    className={cn(thClass, i === 0 ? "pl-6" : "", i === arr.length - 1 ? "pr-6" : "")}
                    onClick={() => toggleSort(key)}
                  >
                    {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedPast.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-gray-400 py-12">No past events.</td>
                </tr>
              ) : sortedPast.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="pl-6 pr-3 py-1.5 text-xs text-gray-400 font-mono">{e.eventId}</td>
                  <td className="px-3 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap">{e.eventName}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(e.eventDate, true)}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">{e.competition}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{e.arena ?? "—"}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-700 font-medium">{e.total}</td>
                  <td className="px-3 py-1.5 text-xs text-green-700">{e.approved}</td>
                  <td className="px-3 py-1.5 text-xs text-red-600">{e.rejected}</td>
                  <td className="px-3 py-1.5 text-xs text-amber-600">{e.unanswered}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-700">{e.attendedCount}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{e.pressSeatsCapacity ?? "—"}</td>
                  <td className="pl-3 pr-6 py-1.5 text-xs text-gray-500">{e.photoPitCapacity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <EventDrawer
        event={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) =>
          setEvents((prev) => prev.map((e) =>
            e.id === updated.id ? { ...updated, submissions: e.submissions, _count: e._count } : e
          ))
        }
        onDelete={() => handleDelete(selectedId!)}
      />

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Add event</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Event name</label>
              <input value={addForm.eventName} onChange={(e) => setAddForm((p) => ({ ...p, eventName: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date &amp; kick-off time</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={addForm.eventDate} onChange={(e) => setAddForm((p) => ({ ...p, eventDate: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
                <input type="time" value={addForm.eventTime} onChange={(e) => setAddForm((p) => ({ ...p, eventTime: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Competition</label>
              <select value={addForm.competition} onChange={(e) => setAddForm((p) => ({ ...p, competition: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300 bg-white">
                <option value="">Select competition…</option>
                {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Arena</label>
              <input value={addForm.arena} onChange={(e) => setAddForm((p) => ({ ...p, arena: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CMS Event ID <span className="text-gray-400">(optional)</span></label>
              <input value={addForm.cmsEventId} onChange={(e) => setAddForm((p) => ({ ...p, cmsEventId: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" placeholder="e.g. 12345" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Press seats capacity</label>
                <input type="number" value={addForm.pressSeatsCapacity} onChange={(e) => setAddForm((p) => ({ ...p, pressSeatsCapacity: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Photo pit capacity</label>
                <input type="number" value={addForm.photoPitCapacity} onChange={(e) => setAddForm((p) => ({ ...p, photoPitCapacity: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" className="flex-1" onClick={handleAdd} disabled={addSaving || !addForm.eventName || !addForm.eventDate || !addForm.eventTime}>
                {addSaving ? "Adding…" : "Add event"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return <Suspense><EventsPageInner /></Suspense>;
}
