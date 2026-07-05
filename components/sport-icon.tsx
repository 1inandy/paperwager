import type { ReactElement, SVGProps } from "react";

/**
 * Line-style marks for each sport *group* (the values returned by The Odds API
 * `group` field — "Basketball", "Soccer", "Ice Hockey", …). Stroke-based so they
 * inherit `currentColor` and sit comfortably in the muted/industrial palette.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

function Basketball(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.2 5.2A12.7 12.7 0 0 1 5.2 18.8M18.8 5.2a12.7 12.7 0 0 0 0 13.6" />
    </svg>
  );
}

function AmericanFootball(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 5c5-1 9 3 14 0-1 5 1 9-0 14-5 1-9-3-14 0 1-5-1-9 0-14Z" />
      <path d="M9.5 9.5 14.5 14.5M13 9l2 2M11 11l2 2M9 13l2 2" />
    </svg>
  );
}

function Soccer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z" />
      <path d="M12 7V3.2M13.9 12.7l3.3 1.2M10.1 12.7l-3.3 1.2M9 9.2 6 7.4M15 9.2l3-1.8" />
    </svg>
  );
}

function Baseball(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 5.5A11 11 0 0 1 9 12a11 11 0 0 1-3 6.5" />
      <path d="M18 5.5A11 11 0 0 0 15 12a11 11 0 0 0 3 6.5" />
    </svg>
  );
}

function IceHockey(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4v9a3 2.5 0 0 0 3 2.5h6" />
      <path d="M14 15.5 18 19" />
      <ellipse cx="9" cy="19" rx="4" ry="1.6" />
    </svg>
  );
}

function Tennis(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5C9 8 9 16 5.5 18.5M18.5 5.5C15 8 15 16 18.5 18.5" />
    </svg>
  );
}

function Boxing(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 8a3 3 0 0 1 3-3h4a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4h-4a3 3 0 0 1-3-3" />
      <path d="M7 9H5.5A1.5 1.5 0 0 0 4 10.5v1A1.5 1.5 0 0 0 5.5 13H7" />
      <path d="M10 5v3" />
      <path d="M9 17v1.5A1.5 1.5 0 0 0 10.5 20H14a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

function Cricket(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 4.5 19.5 10 9 20.5a1.8 1.8 0 0 1-2.6 0l-2.9-2.9a1.8 1.8 0 0 1 0-2.6L14 4.5Z" />
      <path d="M13 5.6 18.4 11" />
      <circle cx="6.5" cy="6.5" r="2.5" />
    </svg>
  );
}

function MixedMartialArts(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 11V7.5a1.5 1.5 0 0 1 3 0V10m0 0V6a1.5 1.5 0 0 1 3 0v4m0 0V6.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 8.5a1.5 1.5 0 0 1 3 0V14a5 5 0 0 1-5 5h-2.2a5 5 0 0 1-3.6-1.5L4 14.6a1.6 1.6 0 0 1 2.3-2.2L8 14" />
    </svg>
  );
}

function Rugby(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-45 12 12)" />
      <path d="M12 8v8M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

function AussieRules(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="12" rx="5" ry="9" />
      <path d="M9 12h6M12 5v14" />
    </svg>
  );
}

function Lacrosse(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 10a4 4 0 1 0-4-4l4 4Z" />
      <path d="M10 6 4.5 18.5a1.5 1.5 0 0 0 2 2L19 14" />
      <path d="M10.3 5.7 14.3 9.7" />
    </svg>
  );
}

function Golf(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4v13" />
      <path d="M8 4 15 6.5 8 9" />
      <ellipse cx="9.5" cy="19" rx="4.5" ry="1.6" />
    </svg>
  );
}

function Politics(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h16M5 20V10m4 10V10m6 10V10m4 10V10" />
      <path d="M3.5 10 12 4l8.5 6Z" />
    </svg>
  );
}

function Trophy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5C3 9.5 4.5 11 7 11M17 6h2.5A1.5 1.5 0 0 1 21 7.5C21 9.5 19.5 11 17 11" />
      <path d="M12 13v3M9 20h6M10 20l.6-4M14 20l-.6-4" />
    </svg>
  );
}

/** Keyword-matched so league naming variants ("Rugby League"/"Rugby Union") collapse. */
const MATCHERS: { test: RegExp; Icon: (p: IconProps) => ReactElement }[] = [
  { test: /american football|gridiron|nfl|ncaaf/, Icon: AmericanFootball },
  { test: /aussie|afl|australian/, Icon: AussieRules },
  { test: /basketball/, Icon: Basketball },
  { test: /baseball/, Icon: Baseball },
  { test: /box/, Icon: Boxing },
  { test: /cricket/, Icon: Cricket },
  { test: /golf/, Icon: Golf },
  { test: /hockey/, Icon: IceHockey },
  { test: /lacrosse/, Icon: Lacrosse },
  { test: /mma|mixed martial|ufc/, Icon: MixedMartialArts },
  { test: /politic|election/, Icon: Politics },
  { test: /rugby/, Icon: Rugby },
  { test: /soccer|football/, Icon: Soccer },
  { test: /tennis/, Icon: Tennis },
];

export function SportIcon({
  group,
  className,
  ...props
}: { group: string; className?: string } & IconProps) {
  const key = group.toLowerCase();
  const match = MATCHERS.find((m) => m.test.test(key));
  const Icon = match?.Icon ?? Trophy;
  return <Icon className={className} {...props} />;
}
