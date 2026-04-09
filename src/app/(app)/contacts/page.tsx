"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Button from "@/components/ui/Button";
import ContactDrawer from "@/components/contacts/ContactDrawer";
import { cn } from "@/lib/utils";
import type { Contact } from "@prisma/client";

export type ContactWithCounts = Contact & {
  _count: { submissionsAsApplicant: number; submissionsAsAccredited: number };
  attendedCount: number;
  noShowCount: number;
};

const TEAM_OPTIONS = ["Men's team", "Women's team", "Samhällsmatchen", "VIP", "Other"] as const;
type TeamOption = typeof TEAM_OPTIONS[number];
type SortKey = "name" | "company" | "submissions" | "attended" | "noshow";
type SortDir = "asc" | "desc";

function SortIcon({ sortKey, k, sortDir }: { sortKey: SortKey; k: SortKey; sortDir: SortDir }) {
  if (sortKey !== k) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-gray-600 ml-1 inline" />
    : <ChevronDown size={12} className="text-gray-600 ml-1 inline" />;
}

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<ContactWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [addModal, setAddModal] = useState(false);
  const [newContactTeam, setNewContactTeam] = useState<TeamOption[]>([]);
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", company: "", role: "", workPhone: "", cellPhone: "",
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => { setContacts(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const c = contacts.find((c) => c.contactId === id);
      if (c) setSelectedId(c.id);
    }
  }, [searchParams, contacts]);

  const filtered = useMemo(() => {
    let result = contacts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q);
      const teams: string[] = (() => { try { return JSON.parse((c as any).team || "[]"); } catch { return []; } })();
      const matchTeam = !teamFilter || teams.includes(teamFilter);
      return matchSearch && matchTeam;
    });

    return [...result].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name":        av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}`; break;
        case "company":     av = a.company ?? ""; bv = b.company ?? ""; break;
        case "submissions": av = a._count.submissionsAsAccredited; bv = b._count.submissionsAsAccredited; break;
        case "attended":    av = a.attendedCount; bv = b.attendedCount; break;
        case "noshow":      av = a.noShowCount; bv = b.noShowCount; break;
        default: return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [contacts, search, teamFilter, sortKey, sortDir]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;
  const hasFilters = search || teamFilter;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function handleAdd() {
    setAddSaving(true);
    setAddError(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, team: JSON.stringify(newContactTeam) }),
    });
    if (res.status === 409) {
      setAddError("A contact with this name and email already exists.");
      setAddSaving(false);
      return;
    }
    const created = await res.json();
    setContacts((prev) => [{ ...created, attendedCount: 0, noShowCount: 0, _count: { submissionsAsApplicant: 0, submissionsAsAccredited: 0 } }, ...prev]);
    setAddModal(false);
    setAddSaving(false);
    setAddForm({ firstName: "", lastName: "", email: "", company: "", role: "", workPhone: "", cellPhone: "" });
    setNewContactTeam([]);
  }

  const thClass = "px-3 py-2 text-left text-xs font-fg-book-cmpr uppercase tracking-wide text-gray-500 whitespace-nowrap select-none cursor-pointer hover:text-gray-800";
  const selectClass = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 bg-white";

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="pb-4">
      <div className="bg-white rounded-2xl shadow-sm pb-6">

        {/* Title row */}
        <div className="flex items-center justify-between px-6 pt-6 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Contacts
            <span className="ml-2 text-sm font-normal text-gray-400">{filtered.length}</span>
          </h1>
          <Button size="sm" variant="approve" onClick={() => setAddModal(true)}>
            <Plus size={14} /> Add contact
          </Button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-6 pb-3 border-b border-gray-100 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, company…"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-300 w-48"
          />
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={selectClass}>
            <option value="">All teams</option>
            {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setTeamFilter(""); }}
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
                  ["name",        "Name"],
                  ["company",     "Company"],
                  ["submissions", "Submissions"],
                  ["attended",    "Attended"],
                  ["noshow",      "No-shows"],
                ] as [SortKey, string][]).map(([k, label], i) => (
                  <th
                    key={k}
                    className={cn(thClass, i === 0 ? "pl-6" : "")}
                    onClick={() => handleSort(k)}
                  >
                    {label}<SortIcon sortKey={sortKey} k={k} sortDir={sortDir} />
                  </th>
                ))}
                <th className={cn(thClass, "pr-6 cursor-default hover:text-gray-500")}>Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12">No contacts found.</td>
                </tr>
              ) : filtered.map((c) => {
                const teams: string[] = (() => { try { return JSON.parse((c as any).team || "[]"); } catch { return []; } })();
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="pl-6 pr-3 py-2">
                      <p className="text-xs font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[180px]">{c.company ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c._count.submissionsAsAccredited}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.attendedCount ?? 0}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.noShowCount ?? 0}</td>
                    <td className="pl-3 pr-6 py-2">
                      <div className="flex flex-wrap gap-1">
                        {teams.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-sage-100 text-sage-800">{t}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <ContactDrawer
        contact={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
        onDelete={async () => {
          if (!selectedId) return;
          await fetch(`/api/contacts/${selectedId}`, { method: "DELETE" });
          setContacts((prev) => prev.filter((c) => c.id !== selectedId));
          setSelectedId(null);
        }}
      />

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Add contact</h3>
            {addError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>}
            <div className="grid grid-cols-2 gap-3">
              {([["First name","firstName"],["Last name","lastName"]] as [string,string][]).map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input value={(addForm as any)[key]} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
                </div>
              ))}
            </div>
            {([["Email","email"],["Company","company"],["Role","role"],["Work phone","workPhone"],["Cell phone","cellPhone"]] as [string,string][]).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input value={(addForm as any)[key]} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-300" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Team</label>
              <div className="space-y-1.5">
                {TEAM_OPTIONS.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContactTeam.includes(t)}
                      onChange={(e) => setNewContactTeam((prev) => e.target.checked ? [...prev, t] : prev.filter((x) => x !== t))}
                      className="rounded border-gray-300 text-sage-600"
                    />
                    <span className="text-sm text-gray-700">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" className="flex-1" onClick={handleAdd} disabled={addSaving || !addForm.firstName || !addForm.lastName || !addForm.email}>
                {addSaving ? "Adding…" : "Add contact"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setAddModal(false); setAddError(null); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
