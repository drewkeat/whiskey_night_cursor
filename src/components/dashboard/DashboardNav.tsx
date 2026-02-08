"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

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

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="flex h-5 w-5 flex-col justify-center gap-1.5">
      <span
        className={
          "h-0.5 w-5 rounded-full bg-stone-600 transition-all " +
          (open ? "translate-y-2 rotate-45" : "")
        }
      />
      <span
        className={
          "h-0.5 w-5 rounded-full bg-stone-600 transition-all " +
          (open ? "opacity-0 scale-x-0" : "")
        }
      />
      <span
        className={
          "h-0.5 w-5 rounded-full bg-stone-600 transition-all " +
          (open ? "-translate-y-2 -rotate-45" : "")
        }
      />
    </span>
  );
}

export function DashboardNav({ user }: { user: Session["user"] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => setMobileOpen(false), []);

  const linkClass =
    "text-sm font-medium text-stone-700 hover:text-amber-800 block py-3 border-b border-amber-100/80 last:border-0";
  const buttonClass =
    "text-sm font-medium text-stone-700 hover:text-amber-800 text-left w-full py-3 border-t border-amber-100";

  const mobileMenuContent =
    mobileOpen &&
    mounted &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        {/* Backdrop - no responsive hidden; we only render when mobileOpen */}
        <div
          className="fixed inset-0 z-100 bg-black/40"
          aria-hidden
          onClick={closeMenu}
        />
        {/* Dropdown panel: rendered in body, starts below header (3.5rem = 14) */}
        <div
          className="fixed left-0 right-0 top-14 z-101 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-amber-200/60 bg-white shadow-xl"
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="flex flex-col px-4 py-4 pb-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={linkClass}
                onClick={closeMenu}
              >
                {label}
              </Link>
            ))}
            <span className="py-3 text-sm text-stone-500">
              {user?.email ?? user?.name}
            </span>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                signOut({ callbackUrl: "/" });
              }}
              className={buttonClass}
            >
              Sign out
            </button>
          </div>
        </div>
      </>,
      document.body
    );

  return (
    <>
      {/* Desktop nav: visible from md up */}
      <nav className="hidden min-w-0 flex-1 items-center justify-end gap-4 md:flex md:gap-6">
        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href} className="text-sm font-medium text-stone-600 hover:text-amber-800">
            {label}
          </Link>
        ))}
        <span className="text-sm text-stone-500">{user?.email ?? user?.name}</span>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm font-medium text-stone-600 hover:text-amber-800">
          Sign out
        </button>
      </nav>

      {/* Mobile: hamburger button - only visible below md */}
      <div className="flex items-center md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <MenuIcon open={mobileOpen} />
        </button>
      </div>

      {mobileMenuContent}
    </>
  );
}
