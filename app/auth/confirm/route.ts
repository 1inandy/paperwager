import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { migrateGuestToUser } from "@/lib/guest/session";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  try {
    const url = new URL(value, "https://paperwager.local");
    if (url.origin !== "https://paperwager.local") return "/app";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/app";
  }
}

// Landing target for the "Confirm signup" email link. Establishes the
// session server-side (via cookies) so the user is already logged in
// once they arrive at /app — no second login required.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      if (data.user) {
        await migrateGuestToUser(data.user.id);
      }
      redirect(next);
    }
  }

  redirect("/login?error=confirmation_failed");
}
