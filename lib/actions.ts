"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createGuestSession, migrateGuestToUser } from "@/lib/guest/session";
import { getActor, getScorecardsForActor } from "@/lib/auth/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTING_BALANCE } from "@/lib/constants";
import { resolveCanonicalSelection } from "@/lib/betting/resolve-selection";
import { buildBetRecord, validateBet } from "@/lib/betting/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteOrigin } from "@/lib/site-url";
import type { BetSelection } from "@/lib/types";
import { customAlphabet } from "nanoid";

const inviteAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

type BetRecord = ReturnType<typeof buildBetRecord>;

function isMissingMarketOutcomesColumn(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("market_outcomes") &&
      error.message.includes("schema cache"),
  );
}

function withoutMarketOutcomes(record: BetRecord): Omit<BetRecord, "market_outcomes"> {
  const { market_outcomes, ...copy } = record;
  void market_outcomes;
  return copy;
}

async function assertScorecardAccess(scorecardId: string) {
  const actor = await getActor();
  if (!actor) throw new Error("Not authenticated");

  const admin = createAdminClient();
  let query = admin.from("scorecards").select("id").eq("id", scorecardId);

  query =
    actor.type === "user"
      ? query.eq("user_id", actor.userId!)
      : query.eq("guest_session_id", actor.guestSessionId!);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Scorecard not found");
}

export async function enterAsGuestAction() {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(`guest:ip:${ip}`, 10, 60 * 60 * 1000)) {
    throw new Error("Too many guest sessions. Try again later.");
  }

  await createGuestSession();
  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm?next=/app`,
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is required, Supabase returns a user but no session.
  // Don't send them into /app — they aren't logged in yet.
  if (data.user && !data.session) {
    return { needsConfirmation: true, email };
  }

  if (data.user) {
    await migrateGuestToUser(data.user.id);
  }

  redirect("/app");
}

export async function resendConfirmationAction(email: string) {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { error: "Email is required" };
  }

  if (!checkRateLimit(`resend:ip:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many requests. Try again later." };
  }
  if (!checkRateLimit(`resend:email:${normalizedEmail}`, 3, 60 * 60 * 1000)) {
    return { error: "Too many requests for this email. Try again later." };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/app` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email before logging in.", needsConfirmation: true, email };
    }
    return { error: error.message };
  }

  if (data.user) {
    await migrateGuestToUser(data.user.id);
  }

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function placeBetAction(
  scorecardId: string,
  selection: BetSelection,
  stake: number,
) {
  const actor = await getActor();
  if (!actor) return { error: "Not authenticated" };

  const scorecards = await getScorecardsForActor(actor);
  const scorecard = scorecards.find((s) => s.id === scorecardId);
  if (!scorecard) return { error: "Scorecard not found" };

  const validationError = validateBet({
    selection,
    stake,
    balance: Number(scorecard.balance),
  });
  if (validationError) return { error: validationError };

  const resolved = await resolveCanonicalSelection(selection);
  if ("error" in resolved) return { error: resolved.error };

  const canonicalSelection = resolved.selection;
  const betRecord = buildBetRecord(scorecardId, canonicalSelection, stake);
  const admin = createAdminClient();

  const newBalance = Number(scorecard.balance) - stake;

  let { data: bet, error: betError } = await admin
    .from("bets")
    .insert(betRecord)
    .select("id")
    .single();

  if (isMissingMarketOutcomesColumn(betError)) {
    const retry = await admin
      .from("bets")
      .insert(withoutMarketOutcomes(betRecord))
      .select("id")
      .single();

    bet = retry.data;
    betError = retry.error;
  }

  if (betError || !bet) return { error: betError?.message ?? "Failed to place bet" };

  const { error: balanceError } = await admin
    .from("scorecards")
    .update({ balance: newBalance })
    .eq("id", scorecardId);

  if (balanceError) return { error: balanceError.message };

  await admin.from("balance_transactions").insert({
    scorecard_id: scorecardId,
    bet_id: bet.id,
    amount: -stake,
    type: "bet_placed",
    description: `${canonicalSelection.selection} — ${canonicalSelection.market}`,
  });

  revalidatePath("/app");
  revalidatePath("/app/bets");
  return { success: true };
}

export async function createScorecardAction(name: string) {
  const actor = await getActor();
  if (!actor) return { error: "Not authenticated" };
  if (actor.type === "guest") return { error: "Sign up to create multiple scorecards" };

  const supabase = await createClient();
  const { error } = await supabase.from("scorecards").insert({
    user_id: actor.userId,
    name: name.trim() || "New Scorecard",
    balance: STARTING_BALANCE,
    starting_balance: STARTING_BALANCE,
    is_default: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/app/scorecards");
  return { success: true };
}

export async function setDefaultScorecardAction(scorecardId: string) {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const supabase = await createClient();
  await supabase
    .from("scorecards")
    .update({ is_default: false })
    .eq("user_id", actor.userId!);

  const { error } = await supabase
    .from("scorecards")
    .update({ is_default: true })
    .eq("id", scorecardId)
    .eq("user_id", actor.userId!);

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}

export async function deleteScorecardAction(scorecardId: string) {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const scorecards = await getScorecardsForActor(actor);
  if (scorecards.length <= 1) return { error: "Cannot delete your only scorecard" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("scorecards")
    .delete()
    .eq("id", scorecardId)
    .eq("user_id", actor.userId!);

  if (error) return { error: error.message };

  revalidatePath("/app/scorecards");
  return { success: true };
}

export async function createTournamentAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") {
    throw new Error("Sign up to create tournaments");
  }

  const name = (formData.get("name") as string)?.trim();
  const startingBalance = Number(formData.get("startingBalance") ?? STARTING_BALANCE);
  const startsAt = formData.get("startsAt") as string;
  const endsAt = formData.get("endsAt") as string;

  if (!name || !startsAt || !endsAt) throw new Error("All fields are required");

  const admin = createAdminClient();
  const inviteCode = inviteAlphabet();

  const { data: tournament, error: tError } = await admin
    .from("tournaments")
    .insert({
      creator_id: actor.userId,
      name,
      starting_balance: startingBalance,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      invite_code: inviteCode,
      status: "active",
    })
    .select("id")
    .single();

  if (tError || !tournament) throw new Error(tError?.message ?? "Failed to create tournament");

  const { data: scorecard, error: sError } = await admin
    .from("scorecards")
    .insert({
      user_id: actor.userId,
      tournament_id: tournament.id,
      name: `${name} — My Entry`,
      balance: startingBalance,
      starting_balance: startingBalance,
      is_default: false,
    })
    .select("id")
    .single();

  if (sError || !scorecard) throw new Error(sError?.message ?? "Failed to create tournament scorecard");

  await admin.from("tournament_participants").insert({
    tournament_id: tournament.id,
    user_id: actor.userId,
    scorecard_id: scorecard.id,
  });

  revalidatePath("/app/tournaments");
  redirect(`/app/tournaments/${tournament.id}`);
}

export async function joinTournamentAction(inviteCode: string): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") {
    throw new Error("Sign up to join tournaments");
  }

  const admin = createAdminClient();
  const code = inviteCode.trim().toUpperCase();

  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("invite_code", code)
    .eq("status", "active")
    .single();

  if (!tournament) throw new Error("Invalid invite code");

  const { data: existing } = await admin
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", tournament.id)
    .eq("user_id", actor.userId)
    .maybeSingle();

  if (existing) redirect(`/app/tournaments/${tournament.id}`);

  const { data: scorecard, error: sError } = await admin
    .from("scorecards")
    .insert({
      user_id: actor.userId,
      tournament_id: tournament.id,
      name: `${tournament.name} — My Entry`,
      balance: tournament.starting_balance,
      starting_balance: tournament.starting_balance,
      is_default: false,
    })
    .select("id")
    .single();

  if (sError || !scorecard) throw new Error(sError?.message ?? "Failed to join");

  await admin.from("tournament_participants").insert({
    tournament_id: tournament.id,
    user_id: actor.userId,
    scorecard_id: scorecard.id,
  });

  redirect(`/app/tournaments/${tournament.id}`);
}

export async function getBetsForScorecard(scorecardId: string) {
  await assertScorecardAccess(scorecardId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bets")
    .select("*")
    .eq("scorecard_id", scorecardId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getScorecardStats(scorecardId: string) {
  const bets = await getBetsForScorecard(scorecardId);
  const settled = bets.filter((b) => b.status !== "pending");
  const won = settled.filter((b) => b.status === "won").length;
  const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
  const totalProfit = settled.reduce((sum, b) => sum + Number(b.profit ?? 0), 0);

  return {
    totalBets: bets.length,
    openBets: bets.filter((b) => b.status === "pending").length,
    winRate: settled.length > 0 ? Math.round((won / settled.length) * 100) : 0,
    totalStaked,
    totalProfit,
  };
}
