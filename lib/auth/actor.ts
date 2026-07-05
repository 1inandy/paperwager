import { createClient } from "@/lib/supabase/server";
import { getGuestSessionId } from "@/lib/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/types";

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

export async function getActiveScorecard(actor: Actor, scorecardId?: string) {
  const scorecards = await getScorecardsForActor(actor);
  if (scorecards.length === 0) return null;

  if (scorecardId) {
    return scorecards.find((s) => s.id === scorecardId) ?? scorecards[0];
  }

  return scorecards.find((s) => s.is_default) ?? scorecards[0];
}
