"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createGuestSession, migrateGuestToUser } from "@/lib/guest/session";
import { getActor, getScorecardsForActor } from "@/lib/auth/actor";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTING_BALANCE } from "@/lib/constants";
import { resolveCanonicalSelection } from "@/lib/betting/resolve-selection";
import { buildBetRecord, validateBet } from "@/lib/betting/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteOrigin } from "@/lib/site-url";
import {
  isTournamentDuration,
  resolveTournamentEndsAt,
} from "@/lib/tournaments/duration";
import type { BetSelection, TournamentRole, TournamentStatus } from "@/lib/types";
import { customAlphabet } from "nanoid";

const inviteAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

type BetRecord = ReturnType<typeof buildBetRecord>;
type ActionResult = { error?: string; success?: true };

function isTournamentRole(value: FormDataEntryValue | null): value is TournamentRole {
  return value === "admin" || value === "member";
}

function isTournamentStatus(value: FormDataEntryValue | null): value is TournamentStatus {
  return value === "draft" || value === "active" || value === "completed";
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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

async function getTournamentAccess(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  userId: string,
) {
  const { data: tournament, error: tournamentError } = await admin
    .from("tournaments")
    .select("id, creator_id")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) throw new Error(tournamentError.message);
  if (!tournament) throw new Error("Tournament not found");

  const { data: participant, error: participantError } = await admin
    .from("tournament_participants")
    .select("id, user_id, role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (participantError) throw new Error(participantError.message);

  const isOwner = tournament.creator_id === userId;
  const role = (participant?.role ?? (isOwner ? "admin" : "member")) as TournamentRole;

  return {
    tournament,
    participant,
    isOwner,
    role,
    canManage: isOwner || role === "admin",
  };
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
  const next = safeRedirectPath(formData.get("next"));

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
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

  redirect(next);
}

export async function resendConfirmationAction(email: string, nextValue?: string) {
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

  const next = safeRedirectPath(nextValue);
  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = safeRedirectPath(formData.get("next"));

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

  redirect(next);
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

  const { data: existingBet, error: existingBetError } = await admin
    .from("bets")
    .select("id")
    .eq("scorecard_id", scorecardId)
    .eq("event_id", canonicalSelection.eventId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existingBetError) return { error: existingBetError.message };
  if (existingBet) {
    return {
      error: "You already have a pending bet on this event. Cancel it before placing another.",
    };
  }

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
  revalidatePath(`/app/events/${canonicalSelection.eventId}`);
  return { success: true };
}

export async function cancelPendingBetAction(betId: string) {
  const actor = await getActor();
  if (!actor) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: bet, error: betError } = await admin
    .from("bets")
    .select("id, scorecard_id, event_id, selection, stake, status, commence_time")
    .eq("id", betId)
    .maybeSingle();

  if (betError) return { error: betError.message };
  if (!bet) return { error: "Bet not found" };

  try {
    await assertScorecardAccess(bet.scorecard_id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Not allowed",
    };
  }

  if (bet.status !== "pending") {
    return { error: "Only pending bets can be cancelled" };
  }

  const commenceTime = new Date(bet.commence_time);
  if (commenceTime.getTime() <= Date.now()) {
    return { error: "Event has already started — pending bets are locked" };
  }

  const { data: scorecard, error: scorecardError } = await admin
    .from("scorecards")
    .select("balance")
    .eq("id", bet.scorecard_id)
    .single();

  if (scorecardError) return { error: scorecardError.message };
  if (!scorecard) return { error: "Scorecard not found" };

  const stake = Number(bet.stake);
  const settledAt = new Date().toISOString();
  const { data: cancelledBet, error: cancelError } = await admin
    .from("bets")
    .update({
      status: "void",
      settled_at: settledAt,
      profit: 0,
    })
    .eq("id", bet.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (cancelError) return { error: cancelError.message };
  if (!cancelledBet) return { error: "Bet is no longer pending" };

  const { error: balanceError } = await admin
    .from("scorecards")
    .update({ balance: Number(scorecard.balance) + stake })
    .eq("id", bet.scorecard_id);

  if (balanceError) return { error: balanceError.message };

  const { error: transactionError } = await admin
    .from("balance_transactions")
    .insert({
      scorecard_id: bet.scorecard_id,
      bet_id: bet.id,
      amount: stake,
      type: "bet_void",
      description: `Cancelled: ${bet.selection}`,
    });

  if (transactionError?.code !== "23505" && transactionError) {
    return { error: transactionError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/bets");
  revalidatePath(`/app/events/${bet.event_id}`);
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
  const duration = formData.get("duration");
  const customEndsAt = formData.get("endsAt") as string | null;

  if (!name || !startsAt || !isTournamentDuration(duration)) {
    throw new Error("All fields are required");
  }

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error("Start time is invalid");
  }

  const endsAtDate = resolveTournamentEndsAt({
    startsAt: startsAtDate,
    duration,
    customEndsAt,
  });

  if (Number.isNaN(endsAtDate.getTime())) {
    throw new Error("End time is invalid");
  }

  if (endsAtDate <= startsAtDate) {
    throw new Error("End time must be after start time");
  }

  const admin = createAdminClient();
  const inviteCode = inviteAlphabet();

  const { data: tournament, error: tError } = await admin
    .from("tournaments")
    .insert({
      creator_id: actor.userId,
      name,
      starting_balance: startingBalance,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
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
    role: "admin",
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
    role: "member",
  });

  redirect(`/app/tournaments/${tournament.id}`);
}

export async function updateTournamentSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const tournamentId = getFormString(formData, "tournamentId");
  const name = getFormString(formData, "name");
  const startsAt = getFormString(formData, "startsAt");
  const duration = formData.get("duration");
  const customEndsAt = getFormString(formData, "endsAt");
  const status = formData.get("status");
  const startingBalance = Number(formData.get("startingBalance") ?? STARTING_BALANCE);

  if (!tournamentId || !name || !startsAt) {
    return { error: "All fields are required" };
  }

  if (!isTournamentDuration(duration) || !isTournamentStatus(status)) {
    return { error: "Tournament settings are invalid" };
  }

  if (!Number.isFinite(startingBalance) || startingBalance < 100) {
    return { error: "Starting balance must be at least 100" };
  }

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return { error: "Start time is invalid" };
  }

  let endsAtDate: Date;
  try {
    endsAtDate = resolveTournamentEndsAt({
      startsAt: startsAtDate,
      duration,
      customEndsAt,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "End time is invalid",
    };
  }

  if (Number.isNaN(endsAtDate.getTime())) {
    return { error: "End time is invalid" };
  }

  if (endsAtDate <= startsAtDate) {
    return { error: "End time must be after start time" };
  }

  const admin = createAdminClient();

  try {
    const access = await getTournamentAccess(admin, tournamentId, actor.userId!);
    if (!access.canManage) return { error: "Not allowed" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update tournament",
    };
  }

  const { error } = await admin
    .from("tournaments")
    .update({
      name,
      starting_balance: startingBalance,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
      status,
    })
    .eq("id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath("/app/tournaments");
  revalidatePath(`/app/tournaments/${tournamentId}`);
  return { success: true };
}

export async function updateTournamentParticipantRoleAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const tournamentId = getFormString(formData, "tournamentId");
  const participantId = getFormString(formData, "participantId");
  const role = formData.get("role");

  if (!tournamentId || !participantId || !isTournamentRole(role)) {
    return { error: "Role update is invalid" };
  }

  const admin = createAdminClient();

  let access: Awaited<ReturnType<typeof getTournamentAccess>>;
  try {
    access = await getTournamentAccess(admin, tournamentId, actor.userId!);
    if (!access.canManage) return { error: "Not allowed" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update role",
    };
  }

  const { data: participant, error: participantError } = await admin
    .from("tournament_participants")
    .select("id, user_id")
    .eq("id", participantId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (participantError) return { error: participantError.message };
  if (!participant) return { error: "Participant not found" };

  if (participant.user_id === access.tournament.creator_id && role !== "admin") {
    return { error: "The owner must stay an admin" };
  }

  const { error } = await admin
    .from("tournament_participants")
    .update({ role })
    .eq("id", participantId)
    .eq("tournament_id", tournamentId);

  if (error) return { error: error.message };

  revalidatePath(`/app/tournaments/${tournamentId}`);
  return { success: true };
}

export async function transferTournamentOwnerAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const tournamentId = getFormString(formData, "tournamentId");
  const newOwnerUserId = getFormString(formData, "newOwnerUserId");

  if (!tournamentId || !newOwnerUserId) {
    return { error: "Choose a new owner" };
  }

  const admin = createAdminClient();

  try {
    const access = await getTournamentAccess(admin, tournamentId, actor.userId!);
    if (!access.isOwner) return { error: "Only the owner can transfer ownership" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to transfer ownership",
    };
  }

  const { data: participant, error: participantError } = await admin
    .from("tournament_participants")
    .select("id, user_id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", newOwnerUserId)
    .maybeSingle();

  if (participantError) return { error: participantError.message };
  if (!participant) return { error: "New owner must already be in the tournament" };

  const { error: tournamentError } = await admin
    .from("tournaments")
    .update({ creator_id: newOwnerUserId })
    .eq("id", tournamentId);

  if (tournamentError) return { error: tournamentError.message };

  const { error: roleError } = await admin
    .from("tournament_participants")
    .update({ role: "admin" })
    .eq("id", participant.id);

  if (roleError) return { error: roleError.message };

  revalidatePath("/app/tournaments");
  revalidatePath(`/app/tournaments/${tournamentId}`);
  return { success: true };
}

export async function deleteTournamentAction(formData: FormData): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor || actor.type === "guest") return { error: "Not allowed" };

  const tournamentId = getFormString(formData, "tournamentId");
  if (!tournamentId) return { error: "Tournament is required" };

  const admin = createAdminClient();

  try {
    const access = await getTournamentAccess(admin, tournamentId, actor.userId!);
    if (!access.isOwner) return { error: "Only the owner can delete this tournament" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to delete tournament",
    };
  }

  const { data: scorecards, error: scorecardsError } = await admin
    .from("scorecards")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (scorecardsError) return { error: scorecardsError.message };

  const scorecardIds = (scorecards ?? []).map((scorecard) => scorecard.id);
  if (scorecardIds.length > 0) {
    const { data: bets, error: betsError } = await admin
      .from("bets")
      .select("id")
      .in("scorecard_id", scorecardIds);

    if (betsError) return { error: betsError.message };

    const betIds = (bets ?? []).map((bet) => bet.id);
    if (betIds.length > 0) {
      const { error } = await admin
        .from("balance_transactions")
        .delete()
        .in("bet_id", betIds);

      if (error) return { error: error.message };
    }

    const { error: transactionError } = await admin
      .from("balance_transactions")
      .delete()
      .in("scorecard_id", scorecardIds);

    if (transactionError) return { error: transactionError.message };

    const { error: betsDeleteError } = await admin
      .from("bets")
      .delete()
      .in("scorecard_id", scorecardIds);

    if (betsDeleteError) return { error: betsDeleteError.message };
  }

  const { error: participantsError } = await admin
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId);

  if (participantsError) return { error: participantsError.message };

  if (scorecardIds.length > 0) {
    const { error: scorecardsDeleteError } = await admin
      .from("scorecards")
      .delete()
      .in("id", scorecardIds);

    if (scorecardsDeleteError) return { error: scorecardsDeleteError.message };
  }

  const { error: tournamentError } = await admin
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (tournamentError) return { error: tournamentError.message };

  revalidatePath("/app/tournaments");
  redirect("/app/tournaments");
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
  const pending = bets.filter((b) => b.status === "pending");
  const settled = bets.filter((b) => b.status !== "pending");
  const graded = bets.filter((b) => b.status === "won" || b.status === "lost");
  const won = graded.filter((b) => b.status === "won").length;
  const openExposure = pending.reduce((sum, b) => sum + Number(b.stake), 0);
  const totalProfit = settled.reduce((sum, b) => sum + Number(b.profit ?? 0), 0);

  return {
    totalBets: bets.length,
    openBets: pending.length,
    winRate: graded.length > 0 ? Math.round((won / graded.length) * 100) : 0,
    openExposure,
    totalProfit,
  };
}
