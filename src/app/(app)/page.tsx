"use client";

import { useEffect, useState } from "react";
import type { Submission, Event, Contact } from "@prisma/client";

type SubmissionFull = Submission & {
  event: Event | null;
  applicant: Contact | null;
  accredited: Contact | null;
};

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

  // Summary counts
  const total    = submissions.length;
  const approved = submissions.filter((s) => s.status === "Approved").length;
  const rejected = submissions.filter((s) => s.status === "Rejected").length;
  const pending  = submissions.filter((s) => s.status === "Pending").length;

  // Submissions leaderboard: events ranked by submission count (top 10)
  const eventMap: Record<string, { name: string; count: number }> = {};
  for (const s of submissions) {
    const key = s.eventId;
    const name = s.event?.eventName ?? "Unknown";
    if (!eventMap[key]) eventMap[key] = { name, count: 0 };
    eventMap[key].count++;
  }
  const submissionLeaders = Object.values(eventMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Contact stats: approved, attended, no-shows
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

  // No-show leaderboard (top 10)
  const noShowLeaders = Object.values(contactStats)
    .filter((c) => c.noShow > 0)
    .sort((a, b) => b.noShow - a.noShow)
    .slice(0, 5);

  // Attendance leaderboard (top 10)
  const attendanceLeaders = Object.values(contactStats)
    .filter((c) => c.attended > 0)
    .sort((a, b) => b.attended - a.attended)
    .slice(0, 5);

  return (
    <div className="space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total submissions", value: total,    color: "text-gray-900" },
          { label: "Approved",          value: approved, color: "text-green-600" },
          { label: "Rejected",          value: rejected, color: "text-red-600"   },
          { label: "Pending",           value: pending,  color: "text-orange-500"},
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Submissions leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Submissions leaderboard</h2>
          {submissionLeaders.length === 0 ? (
            <p className="text-gray-400 text-sm">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {submissionLeaders.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <p className="flex-1 text-sm font-medium text-gray-900 truncate">{e.name}</p>
                  <span className="text-sm font-bold text-gray-900">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: No-show + Attendance leaderboards */}
        <div className="flex flex-col gap-4">

          {/* No-show leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">No-show leaderboard</h2>
            {noShowLeaders.length === 0 ? (
              <p className="text-gray-400 text-sm">No no-shows recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {noShowLeaders.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.attended} attended · {c.approved} approved
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-500">{c.noShow}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Attendance leaderboard</h2>
            {attendanceLeaders.length === 0 ? (
              <p className="text-gray-400 text-sm">No attendance recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {attendanceLeaders.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.attended} attended · {c.approved} approved
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-500">{c.attended}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
