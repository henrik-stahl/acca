"use client";

import { Check, X, Clock, Mail, AlertTriangle, Trash2 } from "lucide-react";
import { formatDate, getCompetitionColor, getCompetitionImage, getCapacityTextColor } from "@/lib/utils";
import type { EventWithSubmissions } from "@/app/(app)/events/page";

interface Props {
  event: EventWithSubmissions;
  onClick: () => void;
  onDelete: () => void;
}

export default function EventCard({ event, onClick, onDelete }: Props) {
  const { bg, text } = getCompetitionColor(event.competition);
  const approved = event.submissions.filter((s) => s.status === "Approved").length;
  const rejected = event.submissions.filter((s) => s.status === "Rejected").length;
  const pending = event.submissions.filter((s) => s.status === "Pending").length;
  const infoRequested = event.submissions.filter(
    (s) => s.status === "Info requested"
  ).length;
  const total = event.submissions.length;
  const pressApproved = event.submissions.filter(
    (s) => s.status === "Approved" && s.assignedSeat !== "Photo pit"
  ).length;
  const photoPitApproved = event.submissions.filter(
    (s) => s.status === "Approved" && s.assignedSeat === "Photo pit"
  ).length;
  const totalCapacity = (event.pressSeatsCapacity ?? 0) + (event.photoPitCapacity ?? 0);
  const totalApproved = pressApproved + photoPitApproved;
  const totalRemaining = totalCapacity - totalApproved;
  const capacityColor = getCapacityTextColor(totalApproved, totalCapacity);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl overflow-hidden cursor-pointer shadow hover:shadow-md transition-shadow border border-gray-200 bg-white"
    >
      {/* Competition image */}
      <div className="w-32 h-20 flex-shrink-0 relative overflow-hidden">
        <img
          src={getCompetitionImage(event.competition)}
          alt={event.competition}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Info */}
      <div className="flex-1 py-3">
        <p className="text-xs text-gray-400 mb-0.5">
          {formatDate(event.eventDate, true)}
        </p>
        <p className="font-semibold text-gray-900 text-sm leading-snug">
          {event.eventName}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{event.competition}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 pr-4 text-sm">
        <span className="flex items-center gap-1 text-green-700">
          <Check size={14} />
          {approved}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <X size={14} />
          {rejected}
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <Clock size={14} />
          {pending + infoRequested}
        </span>
        <span className="flex items-center gap-1 text-blue-600">
          <Mail size={14} />
          {total}
        </span>
        {totalCapacity > 0 && (
          <span className={`flex items-center gap-1 ${capacityColor} border-l border-gray-200 pl-3`}>
            <AlertTriangle size={13} className={totalRemaining <= 0 ? "" : "hidden"} />
            {totalRemaining > 0 ? totalRemaining : 0} left
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
