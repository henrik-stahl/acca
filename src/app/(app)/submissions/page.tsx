"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PendingCard from "@/components/submissions/PendingCard";
import SubmissionDrawer from "@/components/submissions/SubmissionDrawer";
import { STATUS_COLORS, CATEGORY_COLORS, CATEGORY_ICONS, cn, formatDate } from "@/lib/utils";
import type { Submission, Event, Contact } from "@prisma/client";

export type SubmissionWithRelations = Submission & {
  event: Event | null;
  applicant: Contact | null;
  accredited: Contact | null;
};

const STATUSES = ["Pending", "Approved", "Rejected", "Info requested"] as const;
const CATEGORIES = ["Press", "Foto", "TV", "Radio", "Webb", "Annat"] as const;
const ASSIGNED_SEATS = ["Press seat", "Photo pit"] as const;
const ACCREDITATION_TYPES = ["Media", "Flash", "Mixed zone", "Fri passage", "Foto", "TV", "Bortalag", "Klubbmedia"] as const;
const PRESS_CARDS = ["AIPS-kort", "Annat presskort", "Kort saknas"] as const;

type SortKey = "submissionId" | "event" | "eventDate" | "name" | "company" | "category" | "assignedSeat" | "accreditationType" | "pressCard" | "createdAt" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-gray-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-gray-600 ml-1 inline" />;
}

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState<SubmissionWithRelations[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("");
  const [accTypeFilter, setAccTypeFilter] = useState("");
  const [pressCardFilter, setPressCardFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Drawer / add modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    eventId: "", accreditedId: "", category: "Press",
    assignedSeat: "Press seat", accreditationType: "Media", pressCard: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/submissions").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]).then(([subs, evts, contacts]) => {
      setSubmissions(subs);
      setAllEvents(evts);
      setAllContacts(contacts);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  const pending = useMemo(() => submissions.filter((s) => s.status === "Pending"), [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const fullName = `${s.accredited?.firstName ?? ""} ${s.accredited?.lastName ?? ""}`.toLowerCase();
      if (nameFilter && !fullName.includes(nameFilter.toLowerCase())) return false;
      if (eventFilter && s.eventId !== eventFilter) return false;
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (seatFilter && s.assignedSeat !== seatFilter) return false;
      if (accTypeFilter && s.accreditationType !== accTypeFilter) return false;
      if (pressCardFilter && s.pressCard !== pressCardFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [submissions, nameFilter, eventFilter, categoryFilter, seatFilter, accTypeFilter, pressCardFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number | Date = "";
      let bv: string | number | Date = "";
      switch (sortKey) {
        case "submissionId": av = a.submissionId; bv = b.submissionId; break;
        case "event": av = a.event?.eventName ?? ""; bv = b.event?.eventName ?? ""; break;
        case "eventDate": av = a.event?.eventDate ? new Date(a.event.eventDate) : new Date(0); bv = b.event?.eventDate ? new Date(b.event.eventDate) : new Date(0); break;
        case "name": av = `${a.accredited?.firstName} ${a.accredited?.lastName}`; bv = `${b.accredited?.firstName} ${b.accredited?.lastName}`; break;
        case "company": av = a.company ?? ""; bv = b.company ?? ""; break;
        case "category": av = a.category; bv = b.category; break;
        case "assignedSeat": av = a.assignedSeat ?? ""; bv = b.assignedSeat ?? ""; break;
        case "accreditationType": av = a.accreditationType ?? ""; bv = b.accreditationType ?? ""; break;
        case "pressCard": av = a.pressCard ?? ""; bv = b.pressCard ?? ""; break;
        case "createdAt": av = new Date(a.createdAt); bv = new Date(b.createdAt); break;
        case "status": av = a.status; bv = b.status; break;
      }
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function exportCsv() {
    const headers = ["Submission ID", "Event", "Event date", "Name", "Company", "Email", "Phone", "Contact", "Category", "Assigned seat", "Accreditation type", "Press card", "Submission date", "Notes", "Status"];
    const rows = sorted.map((s) => [
      s.submissionId,
      s.event?.eventName ?? "",
      s.event?.eventDate ? new Date(s.event.eventDate).toLocaleDateString("sv-SE") : "",
      `${s.accredited?.firstName ?? ""} ${s.accredited?.lastName ?? ""}`.trim(),
      s.company ?? "",
      s.accredited?.email ?? "",
      s.phone ?? "",
      `${s.applicant?.firstName ?? ""} ${s.applicant?.lastName ?? ""}`.trim(),
      s.category,
      s.assignedSeat ?? "",
      s.accreditationType ?? "",
      s.pressCard ?? "",
      new Date(s.createdAt).toLocaleDateString("sv-SE"),
      s.otherNotes ?? "",
      s.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleStatusUpdate(id: string, status: string) {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/submissions/${id}`, { method: "DELETE" });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
  }

  async function handleAdd() {
    setAddSaving(true);
    const res = await fetch("/api/submissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const created = await res.json();
    setSubmissions((prev) => [created, ...prev]);
    setAddModal(false);
    setAddSaving(false);
    setAddForm({ eventId: "", accreditedId: "", category: "Press", assignedSeat: "Press seat", accreditationType: "Media", pressCard: "" });
  }

  const selectClass = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 bg-white";
  const thClass = "px-3 py-2 text-left text-xs font-fg-book-cmpr uppercase tracking-wide text-gray-500 whitespace-nowrap select-none cursor-pointer hover:text-gray-800";

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  const hasFilters = nameFilter || eventFilter || categoryFilter || seatFilter || accTypeFilter || pressCardFilter || statusFilter;

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-4 pb-4">

      {/* ── Pending submissions ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Pending submissions
            {pending.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">{pending.length}</span>
            )}
          </h1>
          <Button size="sm" variant="approve" onClick={() => setAddModal(true)}>
            <Plus size={14} /> Add new submission
          </Button>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">No pending submissions.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <PendingCard
                key={s.id}
                submission={s}
                onClick={() => setSelectedId(s.id)}
                onApprove={() => handleStatusUpdate(s.id, "Approved")}
                onReject={() => handleStatusUpdate(s.id, "Rejected")}
                onInfoNeeded={() => handleStatusUpdate(s.id, "Info requested")}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── All submissions ── */}
      <div className="bg-white rounded-2xl shadow-sm">
        {/* Title row */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            All submissions
            <span className="ml-2 text-sm font-normal text-gray-400">{sorted.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-6 pb-3 border-b border-gray-100 flex-wrap flex-shrink-0">
          {/* Name search */}
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Name…"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 w-32"
          />

          {/* Event filter */}
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className={selectClass}>
            <option value="">All events</option>
            {allEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.eventName}</option>)}
          </select>

          {/* Category filter */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Assigned seat filter */}
          <select value={seatFilter} onChange={(e) => setSeatFilter(e.target.value)} className={selectClass}>
            <option value="">All seats</option>
            {ASSIGNED_SEATS.map((s) => <option key={s}>{s}</option>)}
          </select>

          {/* Accreditation type filter */}
          <select value={accTypeFilter} onChange={(e) => setAccTypeFilter(e.target.value)} className={selectClass}>
            <option value="">All types</option>
            {ACCREDITATION_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>

          {/* Press card filter */}
          <select value={pressCardFilter} onChange={(e) => setPressCardFilter(e.target.value)} className={selectClass}>
            <option value="">All press cards</option>
            {PRESS_CARDS.map((p) => <option key={p}>{p}</option>)}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setNameFilter(""); setEventFilter(""); setCategoryFilter(""); setSeatFilter(""); setAccTypeFilter(""); setPressCardFilter(""); setStatusFilter(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto pb-2">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr>
                {([
                  ["submissionId", "ID"],
                  ["event", "Event"],
                  ["eventDate", "Date"],
                  ["name", "Name"],
                  ["company", "Company"],
                  ["category", "Category"],
                  ["assignedSeat", "Seat"],
                  ["accreditationType", "Type"],
                  ["pressCard", "Press card"],
                  ["createdAt", "Submitted"],
                  ["status", "Status"],
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
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-gray-400 py-12">No submissions found.</td>
                </tr>
              ) : (
                sorted.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="pl-6 pr-3 py-1.5 text-xs text-gray-400 font-mono">{s.submissionId}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{s.event?.eventName ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                      {s.event?.eventDate ? new Date(s.event.eventDate).toLocaleDateString("sv-SE") : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap">
                      {s.accredited?.firstName} {s.accredited?.lastName}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600">{s.company ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      <Badge className={cn("text-xs", CATEGORY_COLORS[s.category] ?? "bg-gray-100 text-gray-700")}>
                        {CATEGORY_ICONS[s.category]} {s.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{s.assignedSeat ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{s.accreditationType ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{s.pressCard ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td className="pl-3 pr-6 py-1.5">
                      <Badge className={cn("text-xs", STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-700")}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <SubmissionDrawer
        submission={selected}
        allEvents={allEvents}
        allContacts={allContacts}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
        onDelete={() => handleDelete(selectedId!)}
      />

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Add submission</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Event</label>
              <select value={addForm.eventId} onChange={(e) => setAddForm((p) => ({ ...p, eventId: e.target.value }))} className={selectClass + " w-full"}>
                <option value="">Select event…</option>
                {allEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.eventName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Accredited person</label>
              <select value={addForm.accreditedId} onChange={(e) => setAddForm((p) => ({ ...p, accreditedId: e.target.value }))} className={selectClass + " w-full"}>
                <option value="">Select contact…</option>
                {allContacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.company ? ` — ${c.company}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select
                value={addForm.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setAddForm((p) => ({
                    ...p, category: cat,
                    assignedSeat: ["Foto", "TV"].includes(cat) ? "Photo pit" : "Press seat",
                    accreditationType: cat === "Foto" ? "Foto" : cat === "TV" ? "TV" : "Media",
                  }));
                }}
                className={selectClass + " w-full"}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assigned seat</label>
                <select value={addForm.assignedSeat} onChange={(e) => setAddForm((p) => ({ ...p, assignedSeat: e.target.value }))} className={selectClass + " w-full"}>
                  <option>Press seat</option><option>Photo pit</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Accreditation type</label>
                <select value={addForm.accreditationType} onChange={(e) => setAddForm((p) => ({ ...p, accreditationType: e.target.value }))} className={selectClass + " w-full"}>
                  <option>Media</option><option>Flash</option><option>Mixed zone</option>
                  <option>Fri passage</option><option>Foto</option><option>TV</option>
                  <option>Bortalag</option><option>Klubbmedia</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Press card</label>
              <select value={addForm.pressCard} onChange={(e) => setAddForm((p) => ({ ...p, pressCard: e.target.value }))} className={selectClass + " w-full"}>
                <option value="">None</option>
                <option>AIPS-kort</option><option>Annat presskort</option><option>Kort saknas</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" className="flex-1" onClick={handleAdd} disabled={addSaving || !addForm.eventId || !addForm.accreditedId}>
                {addSaving ? "Adding…" : "Add submission"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
