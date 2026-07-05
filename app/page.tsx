import { enterAsGuestAction } from "@/lib/actions";
import { LandingClient } from "@/components/landing/landing-client";
import { getLandingFeed } from "@/components/landing/get-feed";

export default async function LandingPage() {
  const feed = await getLandingFeed();
  return <LandingClient guestAction={enterAsGuestAction} feed={feed} />;
}
