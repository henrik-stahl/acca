"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Check, X, Info, Pencil, Copy } from "lucide-react";
import Drawer, { DrawerRow } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  formatDate,
  CATEGORY_ICONS,
  PRESS_CARD_COLORS,
  STATUS_COLORS,
  getCompetitionImage,
  cn,
} from "@/lib/utils";
import type { SubmissionWithRelations } from "@/app/(app)/submissions/page";
import type { Event, Contact } from "@prisma/client";

interface Props {
  submission: SubmissionWithRelations | null;
  onClose: () => void;
  onUpdate: (updated: SubmissionWithRelations) => void;
  onDelete: () => void;
  allEvents: Event[];
  allContacts: Contact[];
}

export default function SubmissionDrawer({
  submission,
  onClose,
  onUpdate,
  onDelete,
  allEvents,
  allContacts,
}: Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    eventId: "",
    accreditedId: "",
    category: "",
    assignedSeat: "",
    accreditationType: "",
    pressCard: "",
  });

  if (!submission) return null;

  function startEdit() {
    setForm({
      eventId: submission!.eventId,
      accreditedId: submission!.accreditedId,
      category: submission!.category ?? "Press",
      assignedSeat: submission!.assignedSeat ?? "Press seat",
      accreditationType: submission!.accreditationType ?? "Media",
      pressCard: submission!.pressCard ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!submission) return;
    setEditSaving(true);
    const contact = allContacts.find((c) => c.id === form.accreditedId);
    const payload = {
      eventId: form.eventId,
      accreditedId: form.accreditedId,
      applicantId: form.accreditedId,
      company: contact?.company ?? "",
      phone: contact?.cellPhone ?? contact?.workPhone ?? "",
      category: form.category,
      assignedSeat: form.assignedSeat,
      accreditationType: form.accreditationType,
      pressCard: form.pressCard || null,
    };
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    onUpdate(updated);
    setEditing(false);
    setEditSaving(false);
  }

  async function updateStatus(status: string, infoMsg?: string) {
    if (!submission) return;
    setSaving(true);
    const body: Record<string, string> = { status };
    if (infoMsg) body.infoRequestMessage = infoMsg;
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    onUpdate(updated);
    setSaving(false);
    setInfoModal(false);
    setInfoMessage("");
  }

  const { event, applicant, accredited } = submission;

  const selectClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400 bg-white";

  return (
    <>
      <Drawer open={!!submission} onClose={onClose}>
        {/* Header */}
        <div className="h-36 relative overflow-hidden">
          <img
            src={getCompetitionImage(event?.competition ?? "")}
            alt={event?.competition ?? ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-wide uppercase drop-shadow">
            {event?.competition}
          </span>
        </div>

        <div className="px-6 py-4">
          {/* Accredited name + link to contact */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {accredited?.firstName} {accredited?.lastName}{" "}
            <Link
              href={`/contacts?id=${accredited?.contactId}`}
              className="text-gray-400 hover:text-gray-600 inline-block"
            >
              <ExternalLink size={14} />
            </Link>
          </h2>

          <div className="border-t border-gray-100 divide-y divide-gray-50">
            <DrawerRow label="Submission ID">
              <span className="flex items-center gap-1.5">
                {submission.submissionId}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/submissions?id=${submission.submissionId}`);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                  title="Copy link"
                >
                  {copiedId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
              </span>
            </DrawerRow>
            <DrawerRow label="Event">
              <Link
                href={`/events?id=${event?.eventId}`}
                className="flex items-center gap-1.5 text-blue-600 hover:underline"
              >
                {event?.eventName}
                <ExternalLink size={12} className="text-gray-400" />
              </Link>
            </DrawerRow>
            <DrawerRow label="Event date">
              {event ? formatDate(event.eventDate, true) : "—"}
            </DrawerRow>
            <DrawerRow label="Company">{submission.company ?? "—"}</DrawerRow>
            <DrawerRow label="Email">
              <a href={`mailto:${accredited?.email}`} className="text-blue-600 hover:underline">
                {accredited?.email}
              </a>
            </DrawerRow>
            <DrawerRow label="Phone">{submission.phone ?? "—"}</DrawerRow>
            <DrawerRow label="Applied by">
              <Link
                href={`/contacts?id=${applicant?.contactId}`}
                className="flex items-center gap-1.5 text-blue-600 hover:underline"
              >
                {applicant?.firstName} {applicant?.lastName}
                <ExternalLink size={12} className="text-gray-400" />
              </Link>
            </DrawerRow>
            <DrawerRow label="Applicant phone">
              {applicant?.cellPhone ?? applicant?.workPhone ?? "—"}
            </DrawerRow>
            <DrawerRow label="Category">
              <span className="text-gray-700 text-sm">
                {CATEGORY_ICONS[submission.category]} {submission.category}
              </span>
            </DrawerRow>
            <DrawerRow label="Assigned seat">
              {submission.assignedSeat ?? "—"}
            </DrawerRow>
            <DrawerRow label="Accreditation type">{submission.accreditationType ?? "—"}</DrawerRow>
            <DrawerRow label="Press card">
              {submission.pressCard ? (
                <Badge
                  className={
                    PRESS_CARD_COLORS[submission.pressCard] ??
                    "bg-gray-100 text-gray-800"
                  }
                >
                  {submission.pressCard}
                </Badge>
              ) : (
                "—"
              )}
            </DrawerRow>
            <DrawerRow label="Submission date">
              {formatDate(submission.createdAt, true)}
            </DrawerRow>
            <DrawerRow label="Other">
              {editingNotes ? (
                <div className="flex flex-col gap-2 w-full">
                  <textarea
                    autoFocus
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="approve"
                      size="sm"
                      disabled={notesSaving}
                      onClick={async () => {
                        setNotesSaving(true);
                        const res = await fetch(`/api/submissions/${submission.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ otherNotes: notesValue }),
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          onUpdate(updated);
                        }
                        setNotesSaving(false);
                        setEditingNotes(false);
                      }}
                    >
                      {notesSaving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 w-full">
                  <span className="flex-1 text-sm">{submission.otherNotes || "—"}</span>
                  <button
                    onClick={() => { setNotesValue(submission.otherNotes ?? ""); setEditingNotes(true); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </DrawerRow>
            <DrawerRow label="Status">
              <Badge className={STATUS_COLORS[submission.status] ?? "bg-gray-100"}>
                {submission.status}
              </Badge>
            </DrawerRow>
            {submission.infoRequestMessage && (
              <DrawerRow label="Info request">
                <span className="text-gray-600 italic text-xs">
                  {submission.infoRequestMessage}
                </span>
              </DrawerRow>
            )}
          </div>

          {/* Attended toggle — only for Approved submissions */}
          {submission.status === "Approved" && (
            <div className="mt-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Attendance
              </p>
              <button
                onClick={async () => {
                  setSaving(true);
                  const res = await fetch(`/api/submissions/${submission.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ attended: !submission.attended }),
                  });
                  const updated = await res.json();
                  onUpdate(updated);
                  setSaving(false);
                }}
                disabled={saving}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  submission.attended ? "bg-green-500" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    submission.attended ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
              <span className="ml-3 text-sm text-gray-700">
                {submission.attended ? "Attended" : "Did not attend"}
              </span>
            </div>
          )}

          {/* Update status */}
          <div className="mt-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Update status
            </p>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { label: "Pending",        onClick: () => updateStatus("Pending") },
                  { label: "Approved",       onClick: () => setApproveModal(true) },
                  { label: "Rejected",       onClick: () => setRejectModal(true) },
                  { label: "Info requested", onClick: () => setInfoModal(true) },
                ] as { label: string; onClick: () => void }[]
              ).map(({ label, onClick }) => {
                const isActive = submission.status === label;
                return (
                  <button
                    key={label}
                    disabled={isActive || saving}
                    onClick={onClick}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      isActive
                        ? cn(STATUS_COLORS[label], "ring-2 ring-offset-1 ring-current cursor-default opacity-100")
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Edit submission */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            {!editing ? (
              <Button variant="outline" size="sm" className="w-full" onClick={startEdit}>
                Edit submission
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Edit submission
                </p>

                {/* Event */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Event</label>
                  <select
                    value={form.eventId}
                    onChange={(e) => setForm((p) => ({ ...p, eventId: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Select event…</option>
                    {allEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.eventName} — {new Date(ev.eventDate).toLocaleDateString("sv-SE")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Accredited person */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Accredited person</label>
                  <select
                    value={form.accreditedId}
                    onChange={(e) => setForm((p) => ({ ...p, accreditedId: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Select contact…</option>
                    {allContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}{c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const seat = ["Foto", "TV"].includes(cat) ? "Photo pit" : "Press seat";
                      const accreditationType = cat === "Foto" ? "Foto" : cat === "TV" ? "TV" : "Media";
                      setForm((p) => ({ ...p, category: cat, assignedSeat: seat, accreditationType }));
                    }}
                    className={selectClass}
                  >
                    <option>Press</option>
                    <option>Foto</option>
                    <option>TV</option>
                    <option>Radio</option>
                    <option>Webb</option>
                    <option>Annat</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Assigned seat */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Assigned seat</label>
                    <select
                      value={form.assignedSeat}
                      onChange={(e) => setForm((p) => ({ ...p, assignedSeat: e.target.value }))}
                      className={selectClass}
                    >
                      <option>Press seat</option>
                      <option>Photo pit</option>
                    </select>
                  </div>

                  {/* Accreditation type */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Accreditation type</label>
                    <select
                      value={form.accreditationType}
                      onChange={(e) => setForm((p) => ({ ...p, accreditationType: e.target.value }))}
                      className={selectClass}
                    >
                      <option>Media</option>
                      <option>Flash</option>
                      <option>Mixed zone</option>
                      <option>Fri passage</option>
                      <option>Foto</option>
                      <option>TV</option>
                      <option>Bortalag</option>
                      <option>Klubbmedia</option>
                    </select>
                  </div>
                </div>

                {/* Press card */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Press card</label>
                  <select
                    value={form.pressCard}
                    onChange={(e) => setForm((p) => ({ ...p, pressCard: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">None</option>
                    <option>AIPS-kort</option>
                    <option>Annat presskort</option>
                    <option>Kort saknas</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="approve"
                    size="sm"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={editSaving || !form.eventId || !form.accreditedId}
                  >
                    {editSaving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Delete submission */}
          <div className="mt-3">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg py-2 transition-colors"
              >
                Delete submission
              </button>
            ) : (
              <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
                <p className="text-sm text-red-700 font-medium">Are you sure you want to delete this submission?</p>
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

      {/* Approve confirmation modal */}
      {approveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve submission</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to approve this submission?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { updateStatus("Approved"); setApproveModal(false); }}
                className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Yes, approve
              </button>
              <button
                onClick={() => setApproveModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject submission</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to reject this submission?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { updateStatus("Rejected"); setRejectModal(false); }}
                className="flex-1 bg-red-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, reject
              </button>
              <button
                onClick={() => setRejectModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info request modal */}
      {infoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Request additional information
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Explain what information is needed. This message will be included
              in the email sent to the applicant and accredited individual.
            </p>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="Describe what information is needed..."
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-sage-400 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="info"
                size="sm"
                className="flex-1"
                disabled={saving || !infoMessage.trim()}
                onClick={() => updateStatus("Info requested", infoMessage)}
              >
                {saving ? "Sending..." : "Send request"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setInfoModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
