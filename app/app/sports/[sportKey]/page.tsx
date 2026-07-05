import { redirect } from "next/navigation";

interface LegacySportRouteProps {
  params: Promise<{ sportKey: string }>;
}

/** Back-compat redirect to league events page. */
export default async function LegacySportRoute({ params }: LegacySportRouteProps) {
  const { sportKey } = await params;
  redirect(`/app/leagues/${sportKey}`);
}
