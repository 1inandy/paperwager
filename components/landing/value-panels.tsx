"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "./gsap";
import { valueProps } from "./content";

export function ValuePanels() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const panels = gsap.utils.toArray<HTMLElement>(".value-panel");
      panels.forEach((panel) => {
        gsap.from(panel.querySelectorAll("[data-reveal]"), {
          opacity: 0,
          y: 40,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: panel, start: "top 70%" },
        });
        // parallax drift on the giant index numeral
        gsap.to(panel.querySelector(".panel-index"), {
          yPercent: -30,
          ease: "none",
          scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mx-auto max-w-6xl px-6">
      {valueProps.map((prop) => (
        <section
          key={prop.index}
          className="value-panel relative grid items-center gap-8 border-t border-border py-24 md:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="panel-index pointer-events-none block font-display text-[clamp(6rem,18vw,14rem)] leading-none text-[#566170]"
            >
              {prop.index}
            </span>
            <span data-reveal className="eyebrow absolute left-1 top-2">
              {prop.tag}
            </span>
          </div>

          <div>
            <h2
              data-reveal
              className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
            >
              {prop.title}
            </h2>
            <p data-reveal className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              {prop.body}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
