import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { withCronLock } from "@/lib/cron/lock";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichEventLogos } from "@/lib/teams/logos";

/** Backfill team logos on cached events from ESPN. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const { skipped, result, error } = await withCronLock("enrich-logos", async () => {
    const admin = createAdminClient();

    const { error: columnError } = await admin
      .from("cached_events")
      .select("home_logo_url")
      .limit(0);
    if (columnError) {
      return {
        updated: 0,
        scanned: 0,
        skippedMigration: true,
        message: "Team logo columns are missing in the database",
      };
    }

    const { data: events } = await admin
      .from("cached_events")
      .select("event_id, sport_key, home_team, away_team")
      .is("home_logo_url", null)
      .limit(200);

    let updated = 0;
    for (const event of events ?? []) {
      const logos = await enrichEventLogos(
        event.sport_key,
        event.home_team,
        event.away_team,
      );
      if (logos.home_logo_url || logos.away_logo_url) {
        await admin.from("cached_events").update(logos).eq("event_id", event.event_id);
        updated++;
      }
    }
    return { updated, scanned: events?.length ?? 0 };
  });

  if (skipped) {
    return NextResponse.json({ skipped: true });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...result });
}

export const dynamic = "force-dynamic";
