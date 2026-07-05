import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function authorizeCron(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET must be set in production" },
      { status: 500 },
    );
  }

  if (!cronSecret) {
    // Dev-only: cron routes are open when CRON_SECRET is unset locally.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  const expected = `Bearer ${cronSecret}`;
  if (!authHeader || !safeEqual(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
