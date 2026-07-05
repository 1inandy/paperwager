import { createClient } from "@/lib/supabase/server";
import type { Actor } from "@/lib/types";

export async function isCurrentUserAdmin(actor: Actor | null) {
  if (!actor || actor.type !== "user" || !actor.userId) return false;

  const adminUserIds = parseEnvList(process.env.ADMIN_USER_IDS);
  if (adminUserIds.has(actor.userId.toLowerCase())) return true;

  const adminEmails = parseEnvList(process.env.ADMIN_EMAILS);
  if (adminEmails.size === 0) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();

  return user?.id === actor.userId && !!email && adminEmails.has(email);
}

function parseEnvList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}
