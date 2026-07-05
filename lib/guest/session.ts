import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME, GUEST_SESSION_DAYS, STARTING_BALANCE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

function getSecret() {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (!secret) throw new Error("GUEST_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createGuestSession() {
  const admin = createAdminClient();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_SESSION_DAYS);

  const { data: session, error: sessionError } = await admin
    .from("guest_sessions")
    .insert({ token_hash: tokenHash, expires_at: expiresAt.toISOString() })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create guest session");
  }

  const { error: scorecardError } = await admin.from("scorecards").insert({
    guest_session_id: session.id,
    name: "Default",
    balance: STARTING_BALANCE,
    starting_balance: STARTING_BALANCE,
    is_default: true,
  });

  if (scorecardError) {
    throw new Error(scorecardError.message);
  }

  const jwt = await new SignJWT({ guestSessionId: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${GUEST_SESSION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_SESSION_DAYS * 24 * 60 * 60,
  });

  return session.id;
}

export async function getGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(GUEST_COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, getSecret());
    return (payload.guestSessionId as string) ?? null;
  } catch {
    return null;
  }
}

export async function clearGuestCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}

export async function migrateGuestToUser(userId: string) {
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) return;

  const admin = createAdminClient();

  const { data: guestSession } = await admin
    .from("guest_sessions")
    .select("id, migrated_to")
    .eq("id", guestSessionId)
    .single();

  if (!guestSession || guestSession.migrated_to) {
    await clearGuestCookie();
    return;
  }

  const { data: existingScorecards } = await admin
    .from("scorecards")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  const hasUserScorecard = (existingScorecards?.length ?? 0) > 0;

  await admin
    .from("scorecards")
    .update({
      user_id: userId,
      guest_session_id: null,
      is_default: !hasUserScorecard,
    })
    .eq("guest_session_id", guestSessionId);

  await admin
    .from("guest_sessions")
    .update({ migrated_to: userId })
    .eq("id", guestSessionId);

  await clearGuestCookie();
}
