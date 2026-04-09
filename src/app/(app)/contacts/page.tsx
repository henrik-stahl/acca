"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<ContactWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add contact form
  const [addModal, setAddModal] = useState(false);
  const [newContactTeam, setNewContactTeam] = useState<TeamOption[]>([]);
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", company: "", role: "", workPhone: "", cellPhone: "",
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchContacts = () =>
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => { setContacts(data); setLoading(false); });

  useEffect(() => { fetchContacts(); }, []);

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

    result = [...result].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name": av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}`; break;
        case "company": av = a.company ?? ""; bv = b.company ?? ""; break;
        case "submissions": av = a._count.submissionsAsAccredited; bv = b._count.submissionsAsAccredited; break;
        case "attended": av = a.attendedCount; bv = b.attendedCount; break;
        case "noshow": av = a.noShowCount; bv = b.noShowCount; break;
        default: return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [contacts, search, teamFilter, sortKey, sortDir]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown size={13} className="text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
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

  const inputClass = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-sage-400";

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="relative ml-4 flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-sage-400"
          />
        </div>
        <select
          value={teamFilter ?? ""}
          onChange={(e) => setTeamFilter(e.target.value || null)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-sage-400 bg-white"
        >
          <option value="">All teams</option>
          {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button size="sm" variant="approve" onClick={() => setAddModal(true)}>
          <Plus size={14} /> Add contact
        </Button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2.5 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide flex-shrink-0">
        {([ ["name", "Name"], ["company", "Company"], ["submissions", "Submissions"], ["attended", "Attended"], ["noshow", "No-shows"] ] as [SortKey, string][]).map(([k, label]) => (
          <button key={k} onClick={() => handleSort(k)} className="flex items-center gap-1 hover:text-gray-600 text-left">
            {label} <SortIcon k={k} />
          </button>
        ))}
        <span>Team</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No contacts found.</div>
        ) : (
          filtered.map((c) => {
            const teams: string[] = (() => { try { return JSON.parse((c as any).team || "[]"); } catch { return []; } })();
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-gray-50 hover:bg-sage-50 cursor-pointer transition-colors items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </div>
                <p className="text-sm text-gray-600 truncate">{c.company ?? "—"}</p>
                <p className="text-sm text-gray-700">{c._count.submissionsAsAccredited}</p>
                <p className="text-sm text-gray-700">{c.attendedCount ?? 0}</p>
                <p className="text-sm text-gray-700">{c.noShowCount ?? 0}</p>
                <div className="flex flex-wrap gap-1">
                  {teams.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-sage-100 text-sage-800">{t}</span>
                  ))}
                </div>
              </div>
            );
          })
        )}
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
                  <input value={(addForm as any)[key]} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} className={inputClass} />
                </div>
              ))}
            </div>
            {([["Email","email"],["Company","company"],["Role","role"],["Work phone","workPhone"],["Cell phone","cellPhone"]] as [string,string][]).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input value={(addForm as any)[key]} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} className={inputClass} />
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
