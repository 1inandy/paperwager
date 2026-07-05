import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function withCronLock<T>(
  jobName: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<{ skipped?: boolean; result?: T; error?: string }> {
  const admin = createAdminClient();
  const lockId = randomUUID();
  const lockedUntil = new Date(Date.now() + ttlMs).toISOString();

  const { data: existing } = await admin
    .from("cron_locks")
    .select("locked_until")
    .eq("job_name", jobName)
    .maybeSingle();

  if (existing && new Date(existing.locked_until) > new Date()) {
    return { skipped: true };
  }

  await admin.from("cron_locks").upsert({
    job_name: jobName,
    locked_until: lockedUntil,
    locked_by: lockId,
  });

  try {
    const result = await fn();
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Job failed" };
  } finally {
    await admin
      .from("cron_locks")
      .delete()
      .eq("job_name", jobName)
      .eq("locked_by", lockId);
  }
}
