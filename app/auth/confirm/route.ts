import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { migrateGuestToUser } from "@/lib/guest/session";
import { safeRedirectPath } from "@/lib/auth/redirect";

// Landing target for the email's one-click verification link. Establishes the
// session server-side (via cookies), then shows the verified success state.
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
      redirect(`/verified?next=${encodeURIComponent(next)}`);
    }
  }

  redirect(`/login?error=confirmation_failed&next=${encodeURIComponent(next)}`);
}
