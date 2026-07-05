import { TournamentsClient } from "@/components/tournaments-client";
import { getActor } from "@/lib/auth/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types";

export default async function TournamentsPage() {
  const actor = await getActor();
  if (!actor) return null;

  let tournaments: Tournament[] = [];

  if (actor.type === "user") {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: participations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", actor.userId!);

    const ids = participations?.map((p) => p.tournament_id) ?? [];

    const { data: created } = await supabase
      .from("tournaments")
      .select("*")
      .eq("creator_id", actor.userId!)
      .order("created_at", { ascending: false });

    let joined: Tournament[] = [];
    if (ids.length > 0) {
      const { data } = await admin
        .from("tournaments")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });
      joined = (data ?? []) as Tournament[];
    }

    const merged = [...(created ?? []), ...joined] as Tournament[];
    const seen = new Set<string>();
    tournaments = merged.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  return (
    <TournamentsClient tournaments={tournaments} isGuest={actor.type === "guest"} />
  );
}
