import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-shell";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import {
  getActor,
  getActiveScorecard,
  getPlayableScorecardsForActor,
} from "@/lib/auth/actor";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor) redirect("/");

  const scorecards = await getPlayableScorecardsForActor(actor);
  const activeScorecard = await getActiveScorecard(actor);
  const isAdmin = await isCurrentUserAdmin(actor);

  return (
    <div className="min-h-screen">
      <AppHeader
        scorecards={scorecards}
        activeScorecardId={activeScorecard?.id ?? ""}
        isGuest={actor.type === "guest"}
        isAdmin={isAdmin}
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
