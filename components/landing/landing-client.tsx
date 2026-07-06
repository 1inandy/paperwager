"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { OddsTicker } from "./odds-ticker";
import { BootHero } from "./boot-hero";
import { ValuePanels } from "./value-panels";
import { StatBand } from "./stat-band";
import type { LandingFeed } from "./content";

export function LandingClient({
  guestAction,
  feed,
}: {
  guestAction: () => void;
  feed: LandingFeed;
}) {
  return (
    <div className="relative">
      {/* quiet, near-invisible structure behind the surfaces */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="terminal-grid absolute inset-0 opacity-100" />
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(16,185,129,0.06),transparent_70%)]" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo priority />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary header-auth-link text-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary header-auth-link text-sm">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <BootHero guestAction={guestAction} feed={feed} />
        <OddsTicker items={feed.ticker} />
        <ValuePanels />
        <StatBand />

        {/* closing CTA */}
        <section className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <p className="eyebrow mb-4">Ready when you are</p>
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-foreground">
            Place your first paper bet
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">
            Enter as a guest for instant access, or sign up free to save your record.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <form action={guestAction}>
              <button type="submit" className="btn-primary min-w-[200px] py-3">
                Enter as guest
              </button>
            </form>
            <Link href="/signup" className="btn-secondary min-w-[200px] py-3">
              Create free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted sm:flex-row">
          <BrandLogo markClassName="h-7 w-7" textClassName="text-base text-foreground/80" />
          <span>Simulated sports betting · independent demo, no league or team affiliation.</span>
        </div>
      </footer>
    </div>
  );
}
