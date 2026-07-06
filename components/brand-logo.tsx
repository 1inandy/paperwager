import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  priority?: boolean;
}

export function BrandLogo({
  className,
  markClassName = "h-8 w-8",
  textClassName,
  showText = true,
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        className={`relative block shrink-0 overflow-hidden ${markClassName}`}
      >
        <Image
          src="/paperwager-logo.png"
          alt=""
          width={64}
          height={64}
          sizes="32px"
          className="h-full w-full object-contain"
          priority={priority}
          unoptimized
        />
      </span>
      {showText && (
        <span
          className={`site-logo-text font-display text-lg font-semibold tracking-tight text-foreground ${textClassName ?? ""}`}
        >
          PaperWager
        </span>
      )}
    </span>
  );
}
