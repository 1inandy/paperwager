"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpAction, resendConfirmationAction } from "@/lib/actions";

type SignUpResult = { error?: string; needsConfirmation?: boolean; email?: string };

export function SignUpForm() {
  const [dismissed, setDismissed] = useState(false);
  const [state, formAction, pending] = useActionState<SignUpResult | null, FormData>(
    async (_prev, formData) => {
      setDismissed(false);
      const result = await signUpAction(formData);
      return result ?? null;
    },
    null,
  );

  if (state?.needsConfirmation && state.email && !dismissed) {
    return <CheckEmail email={state.email} onStartOver={() => setDismissed(true)} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-muted">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          autoComplete="name"
          className="input"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input"
          placeholder="At least 6 characters"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-xs leading-relaxed text-muted">
        By signing up you agree this is a paper-trading sportsbook — no real money changes
        hands.
      </p>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

function CheckEmail({ email, onStartOver }: { email: string; onStartOver: () => void }) {
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setResendState("sending");
    const result = await resendConfirmationAction(email);
    setResendState(result?.error ? "error" : "sent");
  }

  return (
    <div className="page-enter space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-7 w-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0-.828.672-1.5 1.5-1.5h16.5c.828 0 1.5.672 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6.75Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it to activate
          your account — you&apos;ll land right back in the app, already signed in.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background px-4 py-3 text-left text-xs leading-relaxed text-muted">
        Don&apos;t see it? Check spam, or resend below.
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendState === "sending" || resendState === "sent"}
        className="btn-secondary w-full"
      >
        {resendState === "sending"
          ? "Sending…"
          : resendState === "sent"
            ? "Email sent"
            : "Resend confirmation email"}
      </button>
      {resendState === "error" && (
        <p className="text-sm text-danger">Couldn&apos;t resend — try again in a moment.</p>
      )}

      <p className="text-sm text-muted">
        Wrong email?{" "}
        <button
          type="button"
          onClick={onStartOver}
          className="font-medium text-primary hover:underline"
        >
          Start over
        </button>
      </p>
    </div>
  );
}
