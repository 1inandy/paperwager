import { headers } from "next/headers";

/** Canonical site origin for auth redirects. Prefer APP_URL in production. */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // Vercel supplies this for every deployment. It makes auth redirects work
  // even if APP_URL was accidentally omitted from the deployment environment.
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production");
  }

  const headerList = await headers();
  const host = headerList.get("host");
  return host ? `http://${host}` : "http://localhost:3000";
}
