import Image from "next/image";

interface TeamLogoProps {
  name: string;
  logoUrl?: string | null;
  abbreviation?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showAbbr?: boolean;
}

const SIZES = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TeamLogo({
  name,
  logoUrl,
  abbreviation,
  size = "md",
  showAbbr = false,
}: TeamLogoProps) {
  const px = SIZES[size];

  return (
    <div className="flex flex-col items-center gap-1" title={name}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={px}
          height={px}
          className="object-contain"
          unoptimized
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-panel-hover font-bold text-muted"
          style={{ width: px, height: px, fontSize: px * 0.35 }}
          aria-label={name}
        >
          {abbreviation ?? initials(name)}
        </div>
      )}
      {showAbbr && abbreviation && (
        <span className="text-[10px] font-semibold text-muted">{abbreviation}</span>
      )}
    </div>
  );
}

interface TeamMatchupProps {
  awayTeam: string;
  homeTeam: string;
  awayLogo?: string | null;
  homeLogo?: string | null;
  awayAbbr?: string | null;
  homeAbbr?: string | null;
  size?: TeamLogoProps["size"];
  layout?: "vertical" | "horizontal";
}

export function TeamMatchup({
  awayTeam,
  homeTeam,
  awayLogo,
  homeLogo,
  awayAbbr,
  homeAbbr,
  size = "lg",
  layout = "vertical",
}: TeamMatchupProps) {
  if (layout === "horizontal") {
    return (
      <div className="flex items-center justify-center gap-4">
        <TeamLogo
          name={awayTeam}
          logoUrl={awayLogo}
          abbreviation={awayAbbr}
          size={size}
        />
        <span className="text-xs font-medium text-muted">@</span>
        <TeamLogo
          name={homeTeam}
          logoUrl={homeLogo}
          abbreviation={homeAbbr}
          size={size}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <TeamLogo
        name={awayTeam}
        logoUrl={awayLogo}
        abbreviation={awayAbbr}
        size={size}
      />
      <span className="text-xs text-muted">@</span>
      <TeamLogo
        name={homeTeam}
        logoUrl={homeLogo}
        abbreviation={homeAbbr}
        size={size}
      />
    </div>
  );
}

interface TeamBadgeProps {
  name: string;
  logoUrl?: string | null;
  abbreviation?: string | null;
}

/** Inline logo + abbr for bet slips and list rows. */
export function TeamBadge({ name, logoUrl, abbreviation }: TeamBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5" title={name}>
      <TeamLogo name={name} logoUrl={logoUrl} abbreviation={abbreviation} size="xs" />
      <span className="text-xs font-semibold">{abbreviation ?? initials(name)}</span>
    </span>
  );
}
