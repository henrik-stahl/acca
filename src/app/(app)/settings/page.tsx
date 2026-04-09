"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Camera, LogOut } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone((user as any).phone ?? "");
      setNotify((user as any).notifyNewSubmissions ?? true);
      setAvatarUrl(user.image ?? null);
    }
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, notifyNewSubmissions: notify }),
    });
    await update({ name, phone, notifyNewSubmissions: notify });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (data.image) {
      setAvatarUrl(data.image);
      await update({ image: data.image });
    }
    setAvatarUploading(false);
  }

  if (!user) {
    return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover bg-gray-100" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-acca-dark flex items-center justify-center text-white text-xl font-bold select-none">
              {name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            title="Change profile picture"
          >
            <Camera size={12} className="text-gray-600" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{name || "—"}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-acca-yellow text-gray-800 px-2 py-0.5 rounded-full">
            {(user as any).role ?? "Admin"}
          </span>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+46 70 123 45 67"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="border-t border-gray-100 pt-5 mb-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Notifications</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">New submission emails</p>
            <p className="text-xs text-gray-500 mt-0.5">Receive an email when a new accreditation request is submitted.</p>
          </div>
          <button
            onClick={() => setNotify((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-6 flex-shrink-0 ${notify ? "bg-green-500" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notify ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="approve" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </Button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
