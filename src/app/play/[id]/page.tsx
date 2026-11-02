import { Player } from "@/components/player/Player";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Player romId={id} />;
}
