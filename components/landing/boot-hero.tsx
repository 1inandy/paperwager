"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP, prefersReducedMotion } from "./gsap";
import { eyebrow, headline, subhead, sportsChips, type LandingFeed } from "./content";
import { HeroBoard } from "./hero-board";

export function BootHero({
  guestAction,
  feed,
}: {
  guestAction: () => void;
  feed: LandingFeed;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // one calm, quick settle — nothing competes for attention
      gsap.from("[data-rise]", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative isolate min-h-[82svh] overflow-hidden"
    >
      <Image
        src="/landing-sportsbook-hero.png"
        alt=""
        fill
        preload
        unoptimized
        sizes="100vw"
        className="hero-image object-cover object-[70%_35%]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,14,19,0.97)_0%,rgba(11,14,19,0.82)_38%,rgba(11,14,19,0.35)_72%,rgba(11,14,19,0.2)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,19,0.45)_0%,rgba(11,14,19,0)_40%,rgba(11,14,19,0.95)_100%)]" />

      <div className="relative mx-auto flex min-h-[82svh] max-w-6xl flex-col justify-end px-6 pb-10 pt-24 sm:pb-12 lg:pt-28">
        <div className="max-w-3xl">
          <p data-rise className="eyebrow mb-5">
            {eyebrow}
          </p>

          <h1
            aria-label={`${headline[0]} ${headline[1]}`}
            className="font-display text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-tight text-white"
          >
            <span data-rise className="block">
              {headline[0]}
            </span>
            {" "}
            <span data-rise className="block text-primary">
              {headline[1]}
            </span>
          </h1>

          <p data-rise className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {subhead}
          </p>

          <div data-rise className="mt-6 flex flex-wrap gap-2">
            {sportsChips.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm"
              >
                {s}
              </span>
            ))}
          </div>

          <div data-rise className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={guestAction}>
              <button type="submit" className="btn-primary min-w-[200px] py-3">
                Enter as guest
              </button>
            </form>
            <Link href="/signup" className="btn-secondary min-w-[200px] py-3">
              Create free account
            </Link>
          </div>
        </div>

        <div data-rise className="mt-8">
          <HeroBoard feed={feed} />
        </div>
      </div>
    </section>
  );
}
