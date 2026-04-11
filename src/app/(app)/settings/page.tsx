"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, LogOut, UserPlus, X, KeyRound } from "lucide-react";
import Button from "@/components/ui/Button";

interface TeamUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  invitedAt: string | null;
  invitedBy: string | null;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const user = session?.user;
  const isAdmin = (user as any)?.role === "Admin";

  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Team state
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"User" | "Admin">("User");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<TeamUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone((user as any).phone ?? "");
      setNotify((user as any).notifyNewSubmissions ?? true);
      setAvatarUrl(user.image ?? null);
    }
  }, [user]);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      setTeamUsers(data);
    } catch {
      setTeamError("Could not load team members.");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchTeam();
  }, [isAdmin, fetchTeam]);

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

  async function handlePasswordChange() {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    const res = await fetch("/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setPasswordError(err.error ?? "Failed to change password.");
      return;
    }
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  async function handleRoleChange(id: string, role: string) {
    setTeamUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to update role");
      await fetchTeam(); // revert
    }
  }

  async function handleStatusToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setTeamUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to update status");
      await fetchTeam(); // revert
    }
  }

  async function handleInvite() {
    setInviteSending(true);
    setInviteError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, password: invitePassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      setInviteError(err.error ?? "Failed to send invitation");
      setInviteSending(false);
      return;
    }
    setInviteSending(false);
    setInviteSuccess(true);
    await fetchTeam();
    setTimeout(() => {
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("User");
      setInvitePassword("");
      setInviteSuccess(false);
    }, 1500);
  }

  async function handleResetPassword() {
    setResetError(null);
    setResetSuccess(false);
    if (!resetTarget) return;
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    setResetSaving(true);
    const res = await fetch(`/api/users/${resetTarget.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    setResetSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setResetError(err.error ?? "Failed to reset password.");
      return;
    }
    setResetSuccess(true);
    setTimeout(() => {
      setResetTarget(null);
      setResetPassword("");
      setResetSuccess(false);
    }, 1500);
  }

  if (!user) {
    return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;
  }

  const currentUserId = (user as any).id as string;

  return (
    <div className="space-y-6">
      {/* Profile card */}
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+46 70 123 45 67"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
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
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors ml-auto"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg">
        <h2 className="text-base font-bold text-gray-900 mb-4">Change password</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        </div>
        {passwordError && (
          <p className="text-sm text-red-500 mt-3">{passwordError}</p>
        )}
        {passwordSaved && (
          <p className="text-sm text-green-600 mt-3">Password changed successfully!</p>
        )}
        <div className="mt-4">
          <Button
            variant="approve"
            size="sm"
            onClick={handlePasswordChange}
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
          >
            {passwordSaving ? "Saving…" : "Change password"}
          </Button>
        </div>
      </div>

      {/* Team card — Admin only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm pb-6 max-w-4xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Team</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage who has access to Acca.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} className="mr-1.5" />
              Invite user
            </Button>
          </div>

          {teamLoading && (
            <p className="px-6 text-sm text-gray-400">Loading…</p>
          )}
          {teamError && (
            <p className="px-6 text-sm text-red-500">{teamError}</p>
          )}

          {!teamLoading && !teamError && teamUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Role</th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Active</th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {teamUsers.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const isActive = u.status === "active";
                    const isInvited = u.status === "invited";
                    return (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            {u.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.image} alt="" className="w-7 h-7 rounded-full object-cover bg-gray-100 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-acca-dark flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.name?.charAt(0)?.toUpperCase() ?? u.email?.charAt(0)?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{u.name ?? "—"}{isSelf ? " (you)" : ""}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={isSelf}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                          >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive ? "bg-green-100 text-green-700" :
                            isInvited ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {isActive ? "Active" : isInvited ? "Invited" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            disabled={isSelf || isInvited}
                            title={isSelf ? "Cannot deactivate yourself" : isInvited ? "Pending first login" : undefined}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive || isInvited ? "bg-green-500" : "bg-gray-200"
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              isActive || isInvited ? "translate-x-[18px]" : "translate-x-0.5"
                            }`} />
                          </button>
                        </td>
                        <td className="px-6 py-3">
                          {!isSelf && (
                            <button
                              onClick={() => {
                                setResetTarget(u);
                                setResetPassword("");
                                setResetError(null);
                                setResetSuccess(false);
                              }}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
                              title="Reset password"
                            >
                              <KeyRound size={13} />
                              Reset password
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite user modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Invite user</h3>
              <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">User added!</p>
                <p className="text-sm text-gray-500 mt-1">Share the password with them directly.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "User" | "Admin")}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors bg-white"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Initial password</label>
                    <input
                      type="password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1">Share this password with the user separately.</p>
                  </div>
                </div>

                {inviteError && (
                  <p className="text-sm text-red-500 mb-4">{inviteError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInvite}
                    disabled={inviteSending || !inviteEmail.trim() || invitePassword.length < 8}
                    className="flex-1"
                  >
                    {inviteSending ? "Adding…" : "Add user"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResetTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Reset password</h3>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">Password reset!</p>
                <p className="text-sm text-gray-500 mt-1">Share the new password with {resetTarget.name ?? resetTarget.email}.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Set a new password for <strong>{resetTarget.name ?? resetTarget.email}</strong>. Share it with them directly.
                </p>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">New password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                {resetError && (
                  <p className="text-sm text-red-500 mb-4">{resetError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={resetSaving || resetPassword.length < 8}
                    className="flex-1"
                  >
                    {resetSaving ? "Saving…" : "Reset password"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setResetTarget(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
