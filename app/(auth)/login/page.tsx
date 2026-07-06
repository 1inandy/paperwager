import { LoginForm } from "@/components/login-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next: nextParam } = await searchParams;
  const next = safeRedirectPath(nextParam);

  return (
    <>
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Sign in to access your scorecards and bets.
      </p>
      {error === "confirmation_failed" && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          That confirmation link is invalid or has expired. Log in below, or sign up again to
          get a fresh link.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}
