"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clubs", label: "Clubs" },
  { href: "/clubs/invitations", label: "Invitations" },
  { href: "/nights", label: "Nights" },
  { href: "/whiskeys", label: "Whiskeys" },
  { href: "/library", label: "My Library" },
  { href: "/profile", label: "Profile" },
  { href: "/profile/notifications", label: "Notifications" },
];

export function DashboardNav({ user }: { user: Session["user"] }) {
  return (
    <nav className="flex items-center gap-6">
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="text-sm font-medium text-stone-600 hover:text-amber-800"
        >
          {label}
        </Link>
      ))}
      <span className="text-sm text-stone-500">{user?.email ?? user?.name}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm font-medium text-stone-600 hover:text-amber-800"
      >
        Sign out
      </button>
    </nav>
  );
}
