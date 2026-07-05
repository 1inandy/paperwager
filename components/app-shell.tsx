"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScorecardPicker } from "@/components/scorecard-picker";
import { signOutAction } from "@/lib/actions";
import type { Scorecard } from "@/lib/types";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/sports", label: "Make a bet" },
  { href: "/app/scorecards", label: "Scorecards" },
  { href: "/app/tournaments", label: "Tournaments" },
  { href: "/app/admin", label: "Status", adminOnly: true },
];

interface AppHeaderProps {
  scorecards: Scorecard[];
  activeScorecardId: string;
  isGuest: boolean;
  isAdmin: boolean;
}

export function AppHeader({
  scorecards,
  activeScorecardId,
  isGuest,
  isAdmin,
}: AppHeaderProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/app"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/app/sports" className="text-lg font-bold text-primary">
            PaperWager
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ScorecardPicker scorecards={scorecards} activeId={activeScorecardId} />
          {isGuest ? (
            <Link href="/signup" className="btn-primary text-xs">
              Sign up to save
            </Link>
          ) : (
            <form action={signOutAction}>
              <button type="submit" className="btn-secondary text-xs">
                Log out
              </button>
            </form>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
        {visibleNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${
              isActive(item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
