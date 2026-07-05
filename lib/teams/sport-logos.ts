const ESPN_ICON_BASE = "https://a.espncdn.com/redesign/assets/img/icons";

const GROUP_ICON_SLUG: { test: RegExp; slug: string }[] = [
  { test: /american football|gridiron/, slug: "football" },
  { test: /aussie|australian/, slug: "rugby" },
  { test: /basketball/, slug: "basketball" },
  { test: /baseball/, slug: "baseball" },
  { test: /box/, slug: "boxing" },
  { test: /cricket/, slug: "cricket" },
  { test: /golf/, slug: "golf" },
  { test: /hockey/, slug: "hockey" },
  { test: /lacrosse/, slug: "lacrosse" },
  { test: /mma|mixed martial|ufc/, slug: "mma" },
  { test: /rugby/, slug: "rugby" },
  { test: /soccer|football/, slug: "soccer" },
  { test: /tennis/, slug: "tennis" },
  { test: /politic|election/, slug: "football" },
];

export function getSportGroupIconUrl(group: string): string {
  const key = group.toLowerCase();
  const match = GROUP_ICON_SLUG.find((entry) => entry.test.test(key));
  const slug = match?.slug ?? "soccer";
  return `${ESPN_ICON_BASE}/ESPN-icon-${slug}.png`;
}
