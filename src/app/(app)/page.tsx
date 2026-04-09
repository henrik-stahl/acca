"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Submission, Event, Contact } from "@prisma/client";

type SubmissionFull = Submission & {
  event: Event | null;
  applicant: Contact | null;
  accredited: Contact | null;
};

const COLORS = ["#4e9d6e", "#f0a500", "#e05c5c", "#5c7de0", "#9d4e9d", "#4e9d9d", "#9d9d4e"];

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
        Loading…
      </div>
    );
  }

  // Pie chart: submissions grouped by event
  const eventMap: Record<string, { name: string; count: number }> = {};
  for (const s of submissions) {
    const key = s.eventId;
    const name = s.event?.eventName ?? "Unknown";
    if (!eventMap[key]) eventMap[key] = { name, count: 0 };
    eventMap[key].count++;
  }
  const pieData = Object.values(eventMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  const total = submissions.length;

  // Contact no-show stats
  const contactStats: Record<string, { name: string; approved: number; attended: number; noShow: number }> = {};
  for (const s of submissions) {
    const cid = s.accreditedId;
    if (!cid) continue;
    if (!contactStats[cid]) {
      contactStats[cid] = {
        name: s.accredited ? `${s.accredited.firstName} ${s.accredited.lastName}` : cid,
        approved: 0,
        attended: 0,
        noShow: 0,
      };
    }
    if (s.status === "Approved") {
      contactStats[cid].approved++;
      if (s.attended) {
        contactStats[cid].attended++;
      } else if (s.event && new Date(s.event.eventDate) < new Date()) {
        contactStats[cid].noShow++;
      }
    }
  }

  const noShowLeaders = Object.values(contactStats)
    .filter((c) => c.noShow > 0)
    .sort((a, b) => b.noShow - a.noShow)
    .slice(0, 5);

  const pending = submissions.filter((s) => s.status === "Pending").length;
  const approved = submissions.filter((s) => s.status === "Approved").length;
  const rejected = submissions.filter((s) => s.status === "Rejected").length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total submissions", value: total },
          { label: "Approved", value: approved },
          { label: "Pending", value: pending },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Submissions by event */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Submissions</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm">No submissions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  outerRadius={100}
                  label={({ percent }) => `${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [`${val} (${Math.round((val / total) * 100)}%)`, "Submissions"]} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value, entry: any) =>
                    `${value}  ${entry.payload.count} / ${Math.round((entry.payload.count / total) * 100)}%`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* No-show leaders */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">No-show leaderboard</h2>
          {noShowLeaders.length === 0 ? (
            <p className="text-gray-400 text-sm">No no-shows recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {noShowLeaders.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.attended} attended · {c.noShow} no-show{c.noShow !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-500">{c.noShow}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
