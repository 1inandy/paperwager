import { createClient } from "@/lib/supabase/server";
import { getGuestSessionId } from "@/lib/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor, Scorecard } from "@/lib/types";
import { cookies } from "next/headers";

export const ACTIVE_SCORECARD_COOKIE = "paperwager-active-scorecard-id";

export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { type: "user", userId: user.id };
  }

  const guestSessionId = await getGuestSessionId();
  if (guestSessionId) {
    return { type: "guest", guestSessionId };
  }

  return null;
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) {
    throw new Error("Not authenticated");
  }
  return actor;
}

export function getActorClient(actor: Actor) {
  if (actor.type === "user") {
    throw new Error("Use regular Supabase client for authenticated users");
  }
  return createAdminClient();
}

export async function getScorecardsForActor(actor: Actor) {
  if (actor.type === "user") {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scorecards")
      .select("*")
      .eq("user_id", actor.userId!)
      .is("tournament_id", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("scorecards")
    .select("*")
    .eq("guest_session_id", actor.guestSessionId!)
    .is("tournament_id", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTournamentScorecardsForActor(actor: Actor) {
  if (actor.type === "guest") return [];

  const admin = createAdminClient();
  const { data: participations, error: participationsError } = await admin
    .from("tournament_participants")
    .select("scorecard_id")
    .eq("user_id", actor.userId!)
    .order("joined_at", { ascending: true });

  if (participationsError) throw new Error(participationsError.message);

  const scorecardIds = participations?.map((entry) => entry.scorecard_id) ?? [];
  if (scorecardIds.length === 0) return [];

  const { data, error } = await admin
    .from("scorecards")
    .select("*")
    .eq("user_id", actor.userId!)
    .in("id", scorecardIds);

  if (error) throw new Error(error.message);

  const scorecardsById = new Map((data ?? []).map((scorecard) => [scorecard.id, scorecard]));
  return scorecardIds
    .map((scorecardId) => scorecardsById.get(scorecardId))
    .filter((scorecard): scorecard is Scorecard => Boolean(scorecard));
}

export async function getPlayableScorecardsForActor(actor: Actor) {
  if (actor.type === "guest") return getScorecardsForActor(actor);

  const [scorecards, tournamentScorecards] = await Promise.all([
    getScorecardsForActor(actor),
    getTournamentScorecardsForActor(actor),
  ]);

  return [...scorecards, ...tournamentScorecards];
}

export async function getActiveScorecard(actor: Actor, scorecardId?: string) {
  const [regularScorecards, playableScorecards] = await Promise.all([
    getScorecardsForActor(actor),
    getPlayableScorecardsForActor(actor),
  ]);
  if (playableScorecards.length === 0) return null;

  const cookieStore = await cookies();
  const selectedScorecardId =
    scorecardId ?? cookieStore.get(ACTIVE_SCORECARD_COOKIE)?.value;

  if (selectedScorecardId) {
    return (
      playableScorecards.find((s) => s.id === selectedScorecardId) ??
      regularScorecards.find((s) => s.is_default) ??
      regularScorecards[0] ??
      playableScorecards[0]
    );
  }

  return (
    regularScorecards.find((s) => s.is_default) ??
    regularScorecards[0] ??
    playableScorecards[0]
  );
}
