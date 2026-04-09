"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PendingCard from "@/components/submissions/PendingCard";
import SubmissionDrawer from "@/components/submissions/SubmissionDrawer";
import { STATUS_COLORS, CATEGORY_ICONS, cn } from "@/lib/utils";
import type { Submission, Event, Contact } from "@prisma/client";

export type SubmissionWithRelations = Submission & {
  event: Event | null;
  applicant: Contact | null;
  accredited: Contact | null;
};

const STATUSES = ["Pending", "Approved", "Rejected", "Info requested"] as const;
const CATEGORIES = ["Press", "Foto", "TV", "Radio", "Webb", "Annat"] as const;

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState<SubmissionWithRelations[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
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

  // Open drawer if ?id= is in URL
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.submissionId?.toLowerCase().includes(q) ||
        s.accredited?.firstName?.toLowerCase().includes(q) ||
        s.accredited?.lastName?.toLowerCase().includes(q) ||
        s.accredited?.email?.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q) ||
        s.event?.eventName?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || s.status === statusFilter;
      const matchCat = !categoryFilter || s.category === categoryFilter;
      return matchSearch && matchStatus && matchCat;
    });
  }, [submissions, search, statusFilter, categoryFilter]);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  async function handleStatusUpdate(id: string, status: string) {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const created = await res.json();
    setSubmissions((prev) => [created, ...prev]);
    setAddModal(false);
    setAddSaving(false);
    setAddForm({ eventId: "", accreditedId: "", category: "Press", assignedSeat: "Press seat", accreditationType: "Media", pressCard: "" });
  }

  const selectClass = "text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-sage-400 bg-white";

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
        <div className="relative ml-4 flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-sage-400"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                statusFilter === s
                  ? cn(STATUS_COLORS[s], "border-transparent")
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <select
          value={categoryFilter ?? ""}
          onChange={(e) => setCategoryFilter(e.target.value || null)}
          className={selectClass}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
          ))}
        </select>
        <Button size="sm" variant="approve" onClick={() => setAddModal(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 px-6 py-2 border-b border-gray-50 flex-shrink-0">
        {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
        {(statusFilter || categoryFilter || search) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(null); setCategoryFilter(null); }}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} className="inline" /> Clear filters
          </button>
        )}
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No submissions found.</div>
        ) : (
          filtered.map((s) => (
            <PendingCard
              key={s.id}
              submission={s}
              onClick={() => setSelectedId(s.id)}
              onApprove={() => handleStatusUpdate(s.id, "Approved")}
              onReject={() => handleStatusUpdate(s.id, "Rejected")}
              onInfoNeeded={() => handleStatusUpdate(s.id, "Info requested")}
              onDelete={() => handleDelete(s.id)}
            />
          ))
        )}
      </div>

      {/* Drawer */}
      <SubmissionDrawer
        submission={selected}
        allEvents={allEvents}
        allContacts={allContacts}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) =>
          setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        }
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
                {allEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.eventName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Accredited person</label>
              <select value={addForm.accreditedId} onChange={(e) => setAddForm((p) => ({ ...p, accreditedId: e.target.value }))} className={selectClass + " w-full"}>
                <option value="">Select contact…</option>
                {allContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.company ? ` — ${c.company}` : ""}</option>
                ))}
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
                  <option>Press seat</option>
                  <option>Photo pit</option>
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
