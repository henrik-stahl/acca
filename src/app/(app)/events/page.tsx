"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import EventCard from "@/components/events/EventCard";
import EventDrawer from "@/components/events/EventDrawer";
import { COMPETITIONS } from "@/lib/utils";
import type { Event, Submission } from "@prisma/client";

export type EventWithSubmissions = Event & {
  submissions: Array<Pick<Submission, "status" | "category" | "assignedSeat">>;
  _count: { submissions: number };
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    eventName: "", eventDate: "", competition: "", arena: "",
    pressSeatsCapacity: "", photoPitCapacity: "",
  });
  const [addSaving, setAddSaving] = useState(false);

  const fetchEvents = () =>
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => { setEvents(data); setLoading(false); });

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const e = events.find((e) => e.eventId === id);
      if (e) setSelectedId(e.id);
    }
  }, [searchParams, events]);

  const filtered = useMemo(() =>
    events.filter((e) => {
      const q = search.toLowerCase();
      return !q || e.eventName.toLowerCase().includes(q) || (e.competition ?? "").toLowerCase().includes(q) || (e.arena ?? "").toLowerCase().includes(q);
    }),
    [events, search]
  );

  const selected = events.find((e) => e.id === selectedId) ?? null;

  async function handleAdd() {
    setAddSaving(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const created = await res.json();
    setEvents((prev) => [...prev, { ...created, submissions: [], _count: { submissions: 0 } }]);
    setAddModal(false);
    setAddSaving(false);
    setAddForm({ eventName: "", eventDate: "", competition: "", arena: "", pressSeatsCapacity: "", photoPitCapacity: "" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
  }

  const inputClass = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-sage-400";

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <div className="relative ml-4 flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-sage-400"
          />
        </div>
        <Button size="sm" variant="approve" onClick={() => setAddModal(true)}>
          <Plus size={14} /> Add event
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No events found.</div>
        ) : (
          filtered.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onClick={() => setSelectedId(e.id)}
              onDelete={() => handleDelete(e.id)}
            />
          ))
        )}
      </div>

      {/* Drawer */}
      <EventDrawer
        event={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))}
        onDelete={() => handleDelete(selectedId!)}
      />

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Add event</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Event name</label>
              <input value={addForm.eventName} onChange={(e) => setAddForm((p) => ({ ...p, eventName: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input type="date" value={addForm.eventDate} onChange={(e) => setAddForm((p) => ({ ...p, eventDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Competition</label>
              <select value={addForm.competition} onChange={(e) => setAddForm((p) => ({ ...p, competition: e.target.value }))} className={inputClass + " bg-white"}>
                <option value="">Select competition…</option>
                {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Arena</label>
              <input value={addForm.arena} onChange={(e) => setAddForm((p) => ({ ...p, arena: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Press seats capacity</label>
                <input type="number" value={addForm.pressSeatsCapacity} onChange={(e) => setAddForm((p) => ({ ...p, pressSeatsCapacity: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Photo pit capacity</label>
                <input type="number" value={addForm.photoPitCapacity} onChange={(e) => setAddForm((p) => ({ ...p, photoPitCapacity: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" className="flex-1" onClick={handleAdd} disabled={addSaving || !addForm.eventName || !addForm.eventDate}>
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
