"use client";

import { useState } from "react";
import { ExternalLink, Plus, Copy, Check } from "lucide-react";
import Drawer, { DrawerRow } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { ContactWithCounts } from "@/app/(app)/contacts/page";

const TEAM_OPTIONS = ["Men's team", "Women's team", "Samhällsmatchen", "VIP", "Other"] as const;
type TeamOption = typeof TEAM_OPTIONS[number];

interface Props {
  contact: ContactWithCounts | null;
  onClose: () => void;
  onUpdate: (updated: ContactWithCounts) => void;
  onDelete: () => void;
}

export default function ContactDrawer({ contact, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ContactWithCounts>>({});
  const [formTeam, setFormTeam] = useState<TeamOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!contact) return null;

  const comments: Array<{ author: string; timestamp: string; text: string }> =
    (() => {
      try {
        return JSON.parse(contact.comments || "[]");
      } catch {
        return [];
      }
    })();

  const teamValues: TeamOption[] = (() => {
    try {
      return JSON.parse((contact as any).team || "[]");
    } catch {
      return [];
    }
  })();

  const submissionsCount =
    (contact._count?.submissionsAsAccredited ?? 0) +
    (contact._count?.submissionsAsApplicant ?? 0);

  async function handleSave() {
    if (!contact) return;
    setSaving(true);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, team: JSON.stringify(formTeam) }),
    });
    const updated = await res.json();
    onUpdate(updated);
    setEditing(false);
    setSaving(false);
  }

  async function handleAddComment() {
    if (!contact || !newComment.trim()) return;
    const updated_comments = [
      ...comments,
      { author: "You", timestamp: new Date().toISOString(), text: newComment },
    ];
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: JSON.stringify(updated_comments) }),
    });
    const updated = await res.json();
    onUpdate(updated);
    setNewComment("");
  }

  return (
    <Drawer open={!!contact} onClose={onClose}>
      {/* Header image placeholder */}
      <div className="h-28 bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-end px-4 pt-4 gap-3">
        <a href={`mailto:${contact.email}`} className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
        </a>
        <a href={`tel:${contact.cellPhone}`} className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </a>
      </div>

      <div className="px-6 py-4">
        {/* Name */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {contact.firstName} {contact.lastName}
        </h2>

        {/* Details */}
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          <DrawerRow label="Contact ID">
            <span className="flex items-center gap-1.5">
              {contact.contactId}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/contacts?id=${contact.contactId}`);
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
          <DrawerRow label="Creation date">
            {formatDate(contact.createdAt, true)}
          </DrawerRow>
          <DrawerRow label="Company">{contact.company ?? "—"}</DrawerRow>
          <DrawerRow label="Role">{contact.role ?? "—"}</DrawerRow>
          <DrawerRow label="Email">
            <a
              href={`mailto:${contact.email}`}
              className="text-blue-600 hover:underline"
            >
              {contact.email}
            </a>
          </DrawerRow>
          <DrawerRow label="Work phone">{contact.workPhone ?? "—"}</DrawerRow>
          <DrawerRow label="Cell phone">{contact.cellPhone ?? "—"}</DrawerRow>
          <DrawerRow label="Submissions">
            <span className="flex items-center gap-2">
              {submissionsCount}
              <button className="text-gray-400 hover:text-gray-600">
                <ExternalLink size={13} />
              </button>
            </span>
          </DrawerRow>
          <DrawerRow label="Attended">
            {contact._count?.submissionsAsAccredited ?? 0}
          </DrawerRow>
          <DrawerRow label="Attended">
            {(contact as any).attendedCount ?? 0}
          </DrawerRow>
          <DrawerRow label="No-show count">
            {contact.noShowCount ?? 0}
          </DrawerRow>
          <DrawerRow label="Team">
            {teamValues.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {teamValues.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-sage-100 text-sage-800">
                    {t}
                  </span>
                ))}
              </div>
            ) : "—"}
          </DrawerRow>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Comments ({comments.length})
          </h3>
          <div className="space-y-3 mb-3">
            {comments.map((c, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <div className="w-7 h-7 rounded-full bg-sage-300 flex items-center justify-center text-xs font-bold text-sage-800 flex-shrink-0 mt-0.5">
                  {c.author.charAt(0)}
                </div>
                <div>
                  <span className="font-semibold text-sage-700">{c.author}</span>{" "}
                  <span className="text-gray-400 text-xs">
                    {formatDate(c.timestamp)}
                  </span>
                  <p className="text-gray-700 mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              placeholder="Add a comment..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddComment}
              className="border border-gray-200"
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Edit button */}
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => {
              setForm({
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                company: contact.company ?? "",
                role: contact.role ?? "",
                workPhone: contact.workPhone ?? "",
                cellPhone: contact.cellPhone ?? "",
              });
              setFormTeam(teamValues);
              setEditing(true);
            }}
          >
            Edit contact
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">Edit contact</h3>
            {(
              [
                ["First name", "firstName"],
                ["Last name", "lastName"],
                ["Email", "email"],
                ["Company", "company"],
                ["Role", "role"],
                ["Work phone", "workPhone"],
                ["Cell phone", "cellPhone"],
              ] as [string, keyof typeof form][]
            ).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">
                  {label}
                </label>
                <input
                  value={(form[key] as string) ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sage-400"
                />
              </div>
            ))}
            {/* Team */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Team</label>
              <div className="space-y-1.5">
                {TEAM_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formTeam.includes(option)}
                      onChange={(e) => {
                        setFormTeam((prev) =>
                          e.target.checked
                            ? [...prev, option]
                            : prev.filter((t) => t !== option)
                        );
                      }}
                      className="rounded border-gray-300 text-sage-600 focus:ring-sage-400"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
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
              Delete contact
            </button>
          ) : (
            <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
              <p className="text-sm text-red-700 font-medium">Are you sure you want to delete this contact?</p>
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
