"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Drawer, { DrawerRow } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import { FileSpreadsheet } from "lucide-react";
import { formatDate, getCompetitionColor, getCompetitionImage, getCapacityBadgeColor, COMPETITIONS } from "@/lib/utils";
import type { EventWithSubmissions } from "@/app/(app)/events/page";

interface Props {
  event: EventWithSubmissions | null;
  onClose: () => void;
  onUpdate: (updated: EventWithSubmissions) => void;
  onDelete: () => void;
}

export default function EventDrawer({ event, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<EventWithSubmissions> & { eventTime?: string }>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!event) return null;

  const { bg } = getCompetitionColor(event.competition);
  const approved = event.submissions.filter((s) => s.status === "Approved").length;
  const rejected = event.submissions.filter((s) => s.status === "Rejected").length;
  const unanswered = event.submissions.filter(
    (s) => s.status === "Pending" || s.status === "Info requested"
  ).length;
  const pressUsed = event.submissions.filter(
    (s) => s.status === "Approved" && s.assignedSeat !== "Photo pit"
  ).length;
  const photoPitUsed = event.submissions.filter(
    (s) => s.status === "Approved" && s.assignedSeat === "Photo pit"
  ).length;
  const pressTotal = event.pressSeatsCapacity ?? 0;
  const photoPitTotal = event.photoPitCapacity ?? 0;

  async function handleSave() {
    if (!event) return;
    setSaving(true);
    const { eventTime, ...rest } = form;
    const payload: Record<string, unknown> = { ...rest };
    if (payload.eventDate) {
      const time = eventTime ?? "00:00";
      payload.eventDate = new Date(`${payload.eventDate as string}T${time}`).toISOString();
    }
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    onUpdate({ ...updated, submissions: event.submissions });
    setEditing(false);
    setSaving(false);
  }

  return (
    <Drawer open={!!event} onClose={onClose}>
      {/* Header */}
      <div className="h-36 relative overflow-hidden">
        <img
          src={getCompetitionImage(event.competition)}
          alt={event.competition}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-wide uppercase drop-shadow">
          {event.competition}
        </span>
      </div>

      <div className="px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{event.eventName}</h2>

        {/* Capacity badges */}
        <div className="flex gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCapacityBadgeColor(pressUsed, pressTotal)}`}>
            Press seats: <strong>{pressTotal > 0 ? `${pressUsed} / ${pressTotal}` : "—"}</strong>
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCapacityBadgeColor(photoPitUsed, photoPitTotal)}`}>
            Photo pit: <strong>{photoPitTotal > 0 ? `${photoPitUsed} / ${photoPitTotal}` : "—"}</strong>
          </span>
        </div>

        <div className="border-t border-gray-100 divide-y divide-gray-50">
          <DrawerRow label="Event ID">{event.eventId}</DrawerRow>
          <DrawerRow label="Event date">
            {formatDate(event.eventDate, true)}
          </DrawerRow>
          <DrawerRow label="Competition">{event.competition}</DrawerRow>
          <DrawerRow label="Arena">{event.arena ?? "—"}</DrawerRow>
          <DrawerRow label="Submissions">
            <span className="flex items-center gap-2">
              {event.submissions.length}
              <button className="text-gray-400 hover:text-gray-600">
                <ExternalLink size={13} />
              </button>
            </span>
          </DrawerRow>
          <DrawerRow label="Approved">{approved}</DrawerRow>
          <DrawerRow label="Rejected">{rejected}</DrawerRow>
          <DrawerRow label="Unanswered">{unanswered}</DrawerRow>
          <DrawerRow label="Attendees">—</DrawerRow>
        </div>

        {/* Acklista */}
        <div className="mt-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Acklista
          </p>
          <div className="flex gap-2">
            <a
              href={`/api/events/${event.id}/export?acklista=press`}
              download
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet size={13} />
              Pressläktaren
            </a>
            <a
              href={`/api/events/${event.id}/export?acklista=foto`}
              download
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet size={13} />
              Foto / TV
            </a>
          </div>
        </div>

        {/* Edit */}
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => {
              const d = new Date(event.eventDate);
              const pad = (n: number) => String(n).padStart(2, "0");
              const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
              setForm({
                eventName: event.eventName,
                eventDate: dateStr as unknown as Date,
                eventTime: timeStr,
                competition: event.competition,
                arena: event.arena ?? "",
                pressSeatsCapacity: event.pressSeatsCapacity ?? undefined,
                photoPitCapacity: event.photoPitCapacity ?? undefined,
              });
              setEditing(true);
            }}
          >
            Edit event
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">Edit event</h3>
            {/* Event name */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Event name</label>
              <input
                type="text"
                value={(form.eventName as string) ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
              />
            </div>

            {/* Date & time */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date &amp; kick-off time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={(form.eventDate as unknown as string) ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value as unknown as Date }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
                />
                <input
                  type="time"
                  value={form.eventTime ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventTime: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
                />
              </div>
            </div>

            {/* Competition */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Competition</label>
              <select
                value={(form.competition as string) ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, competition: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400 bg-white"
              >
                <option value="">Select competition…</option>
                {COMPETITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Arena */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Arena</label>
              <input
                type="text"
                value={(form.arena as string) ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, arena: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
              />
            </div>

            {/* Capacities */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Press seats capacity</label>
                <input
                  type="number"
                  value={(form.pressSeatsCapacity as number) ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, pressSeatsCapacity: Number(e.target.value) }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Photo pit capacity</label>
                <input
                  type="number"
                  value={(form.photoPitCapacity as number) ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, photoPitCapacity: Number(e.target.value) }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="approve"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="mt-3">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg py-2 transition-colors"
            >
              Delete event
            </button>
          ) : (
            <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
              <p className="text-sm text-red-700 font-medium">Are you sure you want to delete this event?</p>
              <p className="text-xs text-red-500">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="flex-1 bg-red-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-gray-200 bg-white text-gray-600 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
