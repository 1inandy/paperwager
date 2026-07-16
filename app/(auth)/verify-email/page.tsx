import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; next?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email: emailParam, next: nextParam } = await searchParams;
  const email = emailParam?.trim().toLowerCase() ?? "";
  const next = safeRedirectPath(nextParam);

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    redirect(`/signup?next=${encodeURIComponent(next)}`);
  }

  return <VerifyEmailForm email={email} next={next} />;
}
