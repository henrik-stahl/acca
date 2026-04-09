import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string, includeTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (!includeTime) return dateStr;
  const timeStr = d.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr}, ${timeStr}`;
}

export function formatId(prefix: string, num: number): string {
  return `${prefix}${String(num).padStart(5, "0")}`;
}

/** Generate the next sequential ID from an array of existing IDs like "CID00006" */
export function nextId(prefix: string, existingIds: string[]): string {
  const nums = existingIds
    .map((id) => parseInt(id.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return formatId(prefix, max + 1);
}

export const CATEGORY_ICONS: Record<string, string> = {
  Press: "✍️",
  Foto: "📸",
  TV: "🎥",
  Radio: "📻",
  Webb: "🖥️",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Press: "bg-blue-100 text-blue-800",
  Foto: "bg-green-100 text-green-800",
  Radio: "bg-orange-100 text-orange-800",
  TV: "bg-indigo-100 text-indigo-800",
  Webb: "bg-teal-100 text-teal-800",
  Annat: "bg-gray-100 text-gray-800",
};

export const PRESS_CARD_COLORS: Record<string, string> = {
  "AIPS-kort": "bg-blue-200 text-blue-900",
  "Annat presskort": "bg-gray-200 text-gray-700",
  "Kort saknas": "bg-red-200 text-red-900",
};

export const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-200 text-yellow-900",
  Approved: "bg-green-200 text-green-900",
  Rejected: "bg-red-200 text-red-900",
  "Info requested": "bg-blue-200 text-blue-900",
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  Pending: "bg-yellow-400",
  Approved: "bg-green-500",
  Rejected: "bg-red-500",
  "Info requested": "bg-blue-400",
};

export const STATUS_TEXT_COLORS: Record<string, string> = {
  Pending: "text-amber-700",
  Approved: "text-green-700",
  Rejected: "text-red-700",
  "Info requested": "text-blue-700",
};

export const CATEGORY_DOT_COLORS: Record<string, string> = {
  Press: "bg-blue-500",
  Foto: "bg-green-500",
  Radio: "bg-orange-500",
  TV: "bg-indigo-500",
  Webb: "bg-teal-500",
  Annat: "bg-gray-400",
};

export const CATEGORY_TEXT_COLORS: Record<string, string> = {
  Press: "text-blue-700",
  Foto: "text-green-700",
  Radio: "text-orange-700",
  TV: "text-indigo-700",
  Webb: "text-teal-700",
  Annat: "text-gray-600",
};

/** Predefined competition list for dropdowns */
export const COMPETITIONS = [
  "Allsvenskan",
  "OBOS Damallsvenskan",
  "Svenska Cupen",
  "UEFA Women's Europa Cup",
  "Träningsmatch",
] as const;

export type Competition = (typeof COMPETITIONS)[number];

/**
 * Prefix-based patterns for image + colour mapping.
 * A competition string matches if it starts with the given prefix (case-insensitive),
 * so "Allsvenskan 2026", "Svenska Cupen, slutspel", etc. all resolve correctly.
 * Unrecognised competitions fall back to the generic football image / grey colour.
 */
const COMPETITION_PATTERNS: Array<{
  prefix: string;
  image: string;
  color: { bg: string; text: string };
}> = [
  {
    prefix: "Allsvenskan",
    image: "/competitions/allsvenskan-logo.png",
    color: { bg: "#1a1f5e", text: "white" },
  },
  {
    prefix: "OBOS Damallsvenskan",
    image: "/competitions/obos_damallsvenskan.jpg",
    color: { bg: "#0a5c28", text: "white" },
  },
  {
    prefix: "Svenska Cupen",
    image: "/competitions/svenska-cupen.png",
    color: { bg: "#1e4d8c", text: "white" },
  },
  {
    prefix: "UEFA Women's Europa Cup",
    image: "/competitions/UEFA-Womens-Europa-Cup.png",
    color: { bg: "#c05a10", text: "white" },
  },
];

const COMPETITION_FALLBACK_COLOR = { bg: "#374151", text: "white" };
export const COMPETITION_IMAGES_FALLBACK = "/competitions/football_fallback.jpg";

function matchCompetitionPattern(competition: string) {
  const lower = (competition ?? "").toLowerCase();
  return COMPETITION_PATTERNS.find(({ prefix }) =>
    lower.startsWith(prefix.toLowerCase())
  );
}

export function getCompetitionColor(competition: string) {
  return matchCompetitionPattern(competition)?.color ?? COMPETITION_FALLBACK_COLOR;
}

export function getCompetitionImage(competition: string): string {
  return matchCompetitionPattern(competition)?.image ?? COMPETITION_IMAGES_FALLBACK;
}

/** Categories that count toward Photo pit (all others count toward Press seats) */
export const PHOTO_PIT_CATEGORIES = ["Foto", "TV"];

export function isPhotoPit(category: string): boolean {
  return PHOTO_PIT_CATEGORIES.includes(category);
}

/** Tailwind text colour class based on used/total ratio */
export function getCapacityTextColor(used: number, total: number): string {
  if (total === 0) return "text-gray-400";
  const pct = used / total;
  if (pct >= 1) return "text-red-600 font-semibold";
  if (pct >= 0.8) return "text-amber-600";
  return "text-green-700";
}

/** Tailwind badge colour class based on used/total ratio */
export function getCapacityBadgeColor(used: number, total: number): string {
  if (total === 0) return "bg-gray-100 text-gray-500";
  const pct = used / total;
  if (pct >= 1) return "bg-red-100 text-red-700";
  if (pct >= 0.8) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}
