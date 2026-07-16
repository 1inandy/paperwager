import Link from "next/link";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

interface VerifiedPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function VerifiedPage({ searchParams }: VerifiedPageProps) {
  const { next: nextParam } = await searchParams;
  const next = safeRedirectPath(nextParam);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user?.email_confirmed_at) {
    redirect(`/login?error=confirmation_failed&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="page-enter space-y-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 4.5 4.5 10.5-10.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22.5A10.5 10.5 0 1 0 12 1.5a10.5 10.5 0 0 0 0 21Z" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Email verified</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your account is ready. Welcome to PaperWager.
        </p>
      </div>
      <Link href={next} className="btn-primary block w-full">
        Continue to PaperWager
      </Link>
    </div>
  );
}
