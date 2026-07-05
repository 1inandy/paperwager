import Image from "next/image";
import { SportIcon } from "@/components/sport-icon";

const SIZES = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
} as const;

type LogoSize = keyof typeof SIZES;

interface SportGroupLogoProps {
  group: string;
  logoUrl?: string | null;
  size?: LogoSize;
  className?: string;
}

export function SportGroupLogo({
  group,
  logoUrl,
  size = "md",
  className = "",
}: SportGroupLogoProps) {
  const px = SIZES[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={group}
        width={px}
        height={px}
        className={`object-contain ${className}`}
        unoptimized
      />
    );
  }

  return (
    <SportIcon
      group={group}
      className={className}
      style={{ width: px, height: px }}
    />
  );
}

interface LeagueLogoProps {
  title: string;
  sportGroup?: string | null;
  logoUrl?: string | null;
  size?: LogoSize;
  className?: string;
}

export function LeagueLogo({
  title,
  sportGroup,
  logoUrl,
  size = "md",
  className = "",
}: LeagueLogoProps) {
  const px = SIZES[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={title}
        width={px}
        height={px}
        className={`object-contain ${className}`}
        unoptimized
      />
    );
  }

  if (sportGroup) {
    return (
      <SportGroupLogo
        group={sportGroup}
        size={size}
        className={className}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-panel-hover text-[10px] font-bold text-muted ${className}`}
      style={{ width: px, height: px }}
      aria-label={title}
    >
      {title.slice(0, 2).toUpperCase()}
    </span>
  );
}
