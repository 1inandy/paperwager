import { NextResponse } from "next/server";
import { createGuestSession } from "@/lib/guest/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`guest:ip:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many guest sessions. Try again later." },
      { status: 429 },
    );
  }

  try {
    const sessionId = await createGuestSession();
    return NextResponse.json({ success: true, sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create guest session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
