import { SignUpForm } from "@/components/signup-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

interface SignUpPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next: nextParam } = await searchParams;
  const next = safeRedirectPath(nextParam);

  return (
    <>
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Free forever. Save your scorecards, track your record, and compete in tournaments.
      </p>
      <SignUpForm next={next} />
    </>
  );
}
