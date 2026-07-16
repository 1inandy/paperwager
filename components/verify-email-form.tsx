"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resendConfirmationAction, verifyEmailCodeAction } from "@/lib/actions";

interface VerifyEmailFormProps {
  email: string;
  next: string;
}

type VerificationResult = { error?: string };

export function VerifyEmailForm({ email, next }: VerifyEmailFormProps) {
  const [code, setCode] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [state, formAction, pending] = useActionState<VerificationResult | null, FormData>(
    async (_previous, formData) => (await verifyEmailCodeAction(email, formData.get("code") as string, next)) ?? null,
    null,
  );

  async function handleResend() {
    setResendState("sending");
    const result = await resendConfirmationAction(email, next);
    setResendState(result?.error ? "error" : "sent");
  }

  return (
    <div className="space-y-5">
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0-.828.672-1.5 1.5-1.5h16.5c.828 0 1.5.672 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6.75Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We sent a six-digit code and a secure link to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-muted">
            Confirmation code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="input w-full text-center font-mono text-xl font-semibold tracking-[0.45em]"
            placeholder="000000"
            aria-describedby="code-help"
          />
          <p id="code-help" className="mt-2 text-xs leading-relaxed text-muted">
            You can paste the code from your email, or use the confirmation link instead.
          </p>
        </div>
        {state?.error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending || code.length !== 6} className="btn-primary w-full">
          {pending ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="rounded-lg border border-border bg-background px-4 py-3 text-left text-xs leading-relaxed text-muted">
        Don&apos;t see it? Check your spam folder, then request a new email below.
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
            ? "Verification email sent"
            : "Resend verification email"}
      </button>
      {resendState === "error" && (
        <p className="text-center text-sm text-danger">Couldn&apos;t resend — try again in a moment.</p>
      )}

      <p className="text-center text-sm text-muted">
        Wrong email?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          Start over
        </Link>
      </p>
    </div>
  );
}
