import { Player } from "@/components/player/Player";
import { requireUser } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <Player romId={id} />;
}
