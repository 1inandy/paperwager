// All landing copy + faux market data lives here as plain data so it is
// server-rendered, crawlable, and decoupled from the animation layer.

export const bootLines = [
  "paperwager@terminal:~$ ./connect --feed live",
  "[ OK ] handshake with sportsbook odds feed",
  "[ OK ] 11 sports · 240+ leagues online",
  "[ OK ] balance loaded · $0.00 at risk",
  "session ready — place your first paper bet",
];

export const eyebrow = "Soccer · NBA · NFL · UFC + more · real odds";

export const sportsChips = [
  "Soccer", "NBA", "NFL", "UFC", "live odds", "tournaments",
];

// Sample bet slip shown in the hero board so the product reads instantly.
export const heroSlip = {
  league: "NBA",
  pick: "LA Basketball",
  market: "Moneyline",
  line: "+150",
  stake: 50,
  toWin: 75,
};

export const headline = ["Sports betting", "simulator."];

export const subhead =
  "Make fake-money picks on real odds across soccer, basketball, the NFL, UFC and dozens more leagues worldwide. Practice your reads, track the record, and settle every slip without putting a dollar on the line.";

// Ticker strip — label + moving line, used in the marquee at the top of the hero.
export const tickerOdds = [
  { match: "NBA · LA / BOS", line: "+150", up: true },
  { match: "NFL · KC / BUF", line: "-110", up: false },
  { match: "NBA · GSW / OKC", line: "-118", up: false },
  { match: "NFL · DAL / PHI", line: "+126", up: true },
  { match: "MLB · NY / LA", line: "-135", up: false },
  { match: "NHL · EDM / FLA", line: "+105", up: true },
  { match: "EPL · ARS / MCI", line: "+220", up: true },
  { match: "UFC · MAIN CARD", line: "-120", up: false },
];

export const featuredMatchups = [
  {
    league: "NBA",
    sport: "basketball",
    home: { abbr: "LA", city: "Los Angeles" },
    away: { abbr: "BOS", city: "Boston" },
    market: "Moneyline",
    line: "+150",
    total: "O 216.5",
    accent: "amber",
  },
  {
    league: "NFL",
    sport: "football",
    home: { abbr: "KC", city: "Kansas City" },
    away: { abbr: "BUF", city: "Buffalo" },
    market: "Spread",
    line: "-1.5",
    total: "U 48.5",
    accent: "red",
  },
  {
    league: "EPL",
    sport: "soccer",
    home: { abbr: "ARS", city: "Arsenal" },
    away: { abbr: "MCI", city: "Man City" },
    market: "Match result",
    line: "+220",
    total: "O 2.5",
    accent: "blue",
  },
];

// Faux betting board — animated odds roll in on scroll.
export const boardRows = [
  { league: "NBA", home: "Lakers", away: "Celtics", homeAbbr: "LAL", awayAbbr: "BOS", odds: 1.5, line: "+150" },
  { league: "NFL", home: "Chiefs", away: "Bills", homeAbbr: "KC", awayAbbr: "BUF", odds: 1.91, line: "-110" },
  { league: "EPL", home: "Arsenal", away: "Man City", homeAbbr: "ARS", awayAbbr: "MCI", odds: 3.2, line: "+220" },
  { league: "MLB", home: "Yankees", away: "Dodgers", homeAbbr: "NYY", awayAbbr: "LAD", odds: 1.74, line: "-135" },
  { league: "NHL", home: "Oilers", away: "Panthers", homeAbbr: "EDM", awayAbbr: "FLA", odds: 2.05, line: "+105" },
  { league: "UFC", home: "Adesanya", away: "Pereira", homeAbbr: "ADE", awayAbbr: "PER", odds: 1.83, line: "-120" },
];

export interface ValueProp {
  index: string;
  tag: string;
  title: string;
  body: string;
}

// The five product pillars (carried over from the original landing copy).
export const valueProps: ValueProp[] = [
  {
    index: "01",
    tag: "THE EDGE",
    title: "Beat the odds, not your bank account",
    body: "Make paper bets on real events across a whole range of sports without risking a single real dollar. The lines are live. The losses aren't.",
  },
  {
    index: "02",
    tag: "COVERAGE",
    title: "Sports, sports and more sports",
    body: "NBA, NFL, AFL, NHL, Baseball, Rugby, Football, UFC, Boxing, Cricket, Tennis and more — thousands of real events across dozens of sports, all priced against real bookmaker odds.",
  },
  {
    index: "03",
    tag: "THE LEDGER",
    title: "Keep score",
    body: "You win some, you lose some. The only question that matters: do you win more than you lose? Track every balance and find out if you come out ahead.",
  },
  {
    index: "04",
    tag: "STRATEGY",
    title: "Run multiple playbooks",
    body: "Got more than one angle? Spin up separate scorecards and track each strategy independently — chalk, dogs, parlays, whatever your edge is.",
  },
  {
    index: "05",
    tag: "THE ARENA",
    title: "Challenge your friends",
    body: "Enter tournaments and put your record on the line. Climb the leaderboard, or lose the most fake money trying. Bragging rights only.",
  },
];

export const stats = [
  { value: 11, suffix: "", label: "sports live" },
  { value: 240, suffix: "+", label: "leagues priced" },
  { value: 0, prefix: "$", label: "at real risk" },
];

// ── Landing feed ───────────────────────────────────────────────────
// Shared shapes for the hero board + ticker. These are populated from
// real cached odds at request time (see get-feed.ts) and fall back to
// the SAMPLE_FEED below when no live odds are available.

export interface FeaturedTeam {
  code: string;
  name: string;
  logoUrl?: string | null;
}

export interface FeaturedMatch {
  league: string;
  startsAt: string | null;
  startsLabel: string;
  home: FeaturedTeam;
  away: FeaturedTeam;
  market: string;
  line: string;
  total: string;
  live: boolean;
}

export interface TickerItem {
  match: string;
  line: string;
  up: boolean;
  startsLabel?: string;
}

export interface HeroSlip {
  league: string;
  pick: string;
  pickLogoUrl?: string | null;
  pickAbbr?: string | null;
  market: string;
  line: string;
  stake: number;
  toWin: number;
}

export interface LandingFeed {
  source: "live" | "sample";
  updatedAt: string | null;
  matches: FeaturedMatch[];
  ticker: TickerItem[];
  slip: HeroSlip;
}

// Shown only when live odds can't be loaded — clearly labelled as a sample.
export const SAMPLE_FEED: LandingFeed = {
  source: "sample",
  updatedAt: null,
  matches: [
    {
      league: "NBA",
      startsAt: null,
      startsLabel: "Tonight 8:00 PM ET",
      live: false,
      market: "Moneyline",
      line: "+150",
      total: "O 216.5",
      home: { code: "LAL", name: "LA Lakers" },
      away: { code: "BOS", name: "Boston" },
    },
    {
      league: "NFL",
      startsAt: null,
      startsLabel: "Sun 4:25 PM ET",
      live: false,
      market: "Spread",
      line: "-1.5",
      total: "U 48.5",
      home: { code: "KC", name: "Kansas City" },
      away: { code: "BUF", name: "Buffalo" },
    },
    {
      league: "EPL",
      startsAt: null,
      startsLabel: "Sat 12:30 PM ET",
      live: false,
      market: "Match result",
      line: "+220",
      total: "O 2.5",
      home: { code: "ARS", name: "Arsenal" },
      away: { code: "MCI", name: "Man City" },
    },
  ],
  ticker: tickerOdds,
  slip: {
    league: "NBA",
    pick: "LA Lakers",
    pickAbbr: "LAL",
    market: "Moneyline",
    line: "+150",
    stake: 50,
    toWin: 75,
  },
};
