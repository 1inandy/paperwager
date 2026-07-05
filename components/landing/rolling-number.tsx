"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "./gsap";

interface RollingNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  /** Animate when scrolled into view rather than on mount. */
  onScroll?: boolean;
  className?: string;
}

/**
 * An odometer-style number that rolls up to its target. Plain text content is
 * the final value (server-rendered + accessible); the roll is enhancement only.
 */
export function RollingNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  onScroll = false,
  className,
}: RollingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const format = (n: number) =>
    `${prefix}${n.toFixed(decimals)}${suffix}`;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      const obj = { n: 0 };
      const run = () =>
        gsap.to(obj, {
          n: value,
          duration,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = format(obj.n);
          },
        });

      if (onScroll) {
        gsap.set(el, { textContent: format(0) });
        ScrollTriggerOnce(el, run);
      } else {
        gsap.set(el, { textContent: format(0) });
        run();
      }
    },
    { scope: ref, dependencies: [value] },
  );

  return (
    <span ref={ref} className={`tnum ${className ?? ""}`}>
      {format(value)}
    </span>
  );
}

// Fire a callback the first time the element scrolls into view.
function ScrollTriggerOnce(el: Element, cb: () => void) {
  // Imported lazily to keep this file framework-agnostic for SSR.
  import("./gsap").then(({ ScrollTrigger }) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: cb,
    });
  });
}
