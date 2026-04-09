"use client";

import { Check, X, Info, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { CATEGORY_ICONS, CATEGORY_COLORS, STATUS_COLORS, formatDate } from "@/lib/utils";
import type { SubmissionWithRelations } from "@/app/submissions/page";

interface Props {
  submission: SubmissionWithRelations;
  onApprove: () => void;
  onReject: () => void;
  onInfoNeeded: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export default function PendingCard({
  submission,
  onApprove,
  onReject,
  onInfoNeeded,
  onDelete,
  onClick,
}: Props) {
  const { event, applicant, accredited } = submission;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="grid grid-cols-[140px_1fr_1fr_1fr_100px_100px_160px_80px_80px] gap-3 items-center text-sm">
          <span className="text-gray-500 text-xs">{event?.eventName}</span>
          <span className="font-bold text-gray-900">
            {accredited?.firstName} {accredited?.lastName}
          </span>
          <span className="text-gray-600">{submission.company}</span>
          <span className="text-blue-600 truncate text-xs">
            {accredited?.email}
          </span>
          <span className="text-gray-600 text-xs">
            {applicant?.firstName} {applicant?.lastName}
          </span>
          <span className="text-gray-700 text-xs">
            {CATEGORY_ICONS[submission.category]} {submission.category}
          </span>
          <span className="text-gray-600 text-xs">
            {submission.pressCard ?? "—"}
          </span>
          <span className="text-gray-400 text-xs whitespace-nowrap">
            {formatDate(submission.createdAt)}
          </span>
          <Badge className={STATUS_COLORS[submission.status] ?? "bg-gray-100 text-gray-800"}>
            {submission.status}
          </Badge>
        </div>
      </div>

      {/* Action row */}
      <div
        className="px-4 py-3 flex gap-2 items-center border-t border-gray-200 bg-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete submission"
        >
          <Trash2 size={14} />
        </button>
        <div className="flex gap-2 ml-auto">
          <Button variant="approve" size="sm" onClick={onApprove}>
            <Check size={13} /> Approve
          </Button>
          <Button variant="info" size="sm" onClick={onInfoNeeded}>
            <Info size={13} /> Additional info needed
          </Button>
          <Button variant="reject" size="sm" onClick={onReject}>
            <X size={13} /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
