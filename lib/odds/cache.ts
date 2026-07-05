import { attachLogosToEvent, attachLogosToEvents } from "@/lib/teams/attach-logos";
import { createAdminClient } from "@/lib/supabase/admin";
import { SYNC_SPORT_KEYS } from "@/lib/constants";
import {
  fetchOddsForSport,
  fetchScoresForSport,
  fetchSports,
  normalizeEventOdds,
  type OddsApiScore,
} from "@/lib/odds/client";

export async function syncSportsList() {
  const admin = createAdminClient();
  const sports = await fetchSports();

  const rows = sports.map((s) => ({
    key: s.key,
    title: s.title,
    description: s.description,
    active: s.active,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("cached_sports").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);

  return rows.length;
}

export async function syncOddsForSports(sportKeys: string[] = [...SYNC_SPORT_KEYS]) {
  const admin = createAdminClient();
  let totalEvents = 0;

  for (const sportKey of sportKeys) {
    try {
      const events = await fetchOddsForSport(sportKey);
      if (events.length === 0) continue;

      const rows = events.map((e) => ({
        event_id: e.id,
        sport_key: e.sport_key,
        commence_time: e.commence_time,
        home_team: e.home_team,
        away_team: e.away_team,
        odds: normalizeEventOdds(e),
        synced_at: new Date().toISOString(),
      }));

      const { error } = await admin.from("cached_events").upsert(rows, {
        onConflict: "event_id",
      });
      if (error) throw new Error(error.message);

      totalEvents += rows.length;
    } catch (err) {
      console.error(`Failed to sync odds for ${sportKey}:`, err);
    }
  }

  return totalEvents;
}

export async function syncScoresForSport(sportKey: string) {
  const admin = createAdminClient();
  const scores = await fetchScoresForSport(sportKey);

  for (const score of scores) {
    if (!score.completed) continue;
    await updateEventFromScore(admin, score);
  }

  return scores.filter((s) => s.completed).length;
}

async function updateEventFromScore(
  admin: ReturnType<typeof createAdminClient>,
  score: OddsApiScore,
) {
  const homeScore = score.scores?.find((s) =>
    s.name.toLowerCase().includes(score.home_team.toLowerCase().split(" ")[0] ?? ""),
  );
  const awayScore = score.scores?.find((s) =>
    s.name.toLowerCase().includes(score.away_team.toLowerCase().split(" ")[0] ?? ""),
  );

  await admin
    .from("cached_events")
    .update({
      completed: true,
      status: "final",
      home_score: homeScore ? parseInt(homeScore.score, 10) : null,
      away_score: awayScore ? parseInt(awayScore.score, 10) : null,
      synced_at: new Date().toISOString(),
    })
    .eq("event_id", score.id);
}

export async function getCachedSports() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cached_sports")
    .select("*")
    .eq("active", true)
    .order("title");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCachedEventsBySport(sportKey: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cached_events")
    .select("*")
    .eq("sport_key", sportKey)
    .gte("commence_time", new Date().toISOString())
    .order("commence_time");
  if (error) throw new Error(error.message);
  return attachLogosToEvents(data ?? []);
}

export async function getCachedEvent(eventId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cached_events")
    .select("*")
    .eq("event_id", eventId)
    .single();
  if (error) throw new Error(error.message);
  return attachLogosToEvent(data);
}

export async function getLatestQuotaLog() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_quota_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
