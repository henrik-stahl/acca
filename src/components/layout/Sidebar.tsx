"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  BookUser,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/submissions", label: "Submissions", icon: ListChecks },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/contacts", label: "Contacts", icon: BookUser },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/acca_logo.png" alt="Acca" className="h-16 w-auto object-contain" />
        <div className="w-px self-stretch bg-gray-200 mx-3" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hif-logo.png" alt="Hammarby IF" className="h-16 w-auto object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-acca-yellow text-gray-900"
                  : "text-gray-600 hover:bg-sage-100 hover:text-gray-900"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 pb-4">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sage-50 transition-colors"
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-acca-dark flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-gray-400 truncate leading-tight">
                {(user as any).role ?? "Admin"}
              </p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
