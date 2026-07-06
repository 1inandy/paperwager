"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction, resendConfirmationAction } from "@/lib/actions";

type SignInResult = { error?: string; needsConfirmation?: boolean; email?: string };

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next = "/app" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(
    async (_prev, formData) => {
      const result = await signInAction(formData);
      return result ?? null;
    },
    null,
  );
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    if (!state?.email) return;
    setResendState("sending");
    const result = await resendConfirmationAction(state.email, next);
    setResendState(result?.error ? "error" : "sent");
  }

  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
            autoComplete="current-password"
            className="input"
          />
        </div>
        {state?.error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <p>{state.error}</p>
            {state.needsConfirmation && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "sending" || resendState === "sent"}
                className="mt-1.5 font-medium text-primary hover:underline disabled:no-underline disabled:opacity-70"
              >
                {resendState === "sending"
                  ? "Sending…"
                  : resendState === "sent"
                    ? "Confirmation email sent"
                    : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        No account?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
