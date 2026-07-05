import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTeamName } from "@/lib/betting/odds";

export async function resolveTeamId(
  sportKey: string,
  name: string,
  provider: "espn" | "odds_api" | "manual",
): Promise<string> {
  const admin = createAdminClient();
  const normalized = normalizeTeamName(name);

  const { data: alias } = await admin
    .from("team_aliases")
    .select("team_id")
    .eq("provider", provider)
    .eq("sport_key", sportKey)
    .ilike("alias", normalized)
    .maybeSingle();

  if (alias?.team_id) return alias.team_id;

  const { data: team, error } = await admin
    .from("teams")
    .insert({ sport_key: sportKey, canonical_name: name.trim() })
    .select("id")
    .single();

  if (error) {
    const { data: existing } = await admin
      .from("teams")
      .select("id")
      .eq("sport_key", sportKey)
      .eq("canonical_name", name.trim())
      .single();
    if (!existing) throw new Error(error.message);
    await registerAlias(existing.id, sportKey, name, provider);
    return existing.id;
  }

  await registerAlias(team.id, sportKey, name, provider);
  return team.id;
}

async function registerAlias(
  teamId: string,
  sportKey: string,
  alias: string,
  provider: "espn" | "odds_api" | "manual",
) {
  const admin = createAdminClient();
  await admin.from("team_aliases").upsert(
    { team_id: teamId, provider, alias: alias.trim(), sport_key: sportKey },
    { onConflict: "provider,sport_key,alias" },
  );
}

export async function findTeamByAlias(
  sportKey: string,
  alias: string,
  provider: "espn" | "odds_api" | "manual",
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_aliases")
    .select("team_id")
    .eq("provider", provider)
    .eq("sport_key", sportKey)
    .eq("alias", alias.trim())
    .maybeSingle();
  return data?.team_id ?? null;
}
