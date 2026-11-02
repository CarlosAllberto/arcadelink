import { redirect } from "next/navigation";
import { LoginButton } from "@/components/login/LoginButton";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { data } = await (await createClient()).auth.getClaims();
  if (data?.claims) redirect("/");
  const { erro } = await searchParams;

  return (
    <main className="login">
      <h1>ArcadeLink</h1>
      <p>Seus jogos retrô, direto do seu Google Drive.</p>
      <LoginButton />
      {erro && <p role="alert">Não foi possível entrar. Tente de novo.</p>}
    </main>
  );
}
