import { SignUpForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Free forever. Save your scorecards, track your record, and compete in tournaments.
      </p>
      <SignUpForm />
    </>
  );
}
