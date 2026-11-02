import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

/** Troca o refresh token guardado por um access token de curta duração. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return reply({ error: "reconnect" }, 401);

  const { data, error } = await createAdminClient()
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Falha ao ler o token do Google:", error.message);
    return reply({ error: "storage" }, 500);
  }
  if (!data) return reply({ error: "reconnect" }, 401);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // invalid_grant: token expirado ou revogado, só um novo login resolve.
    if (body?.error === "invalid_grant") return reply({ error: "reconnect" }, 401);
    console.error("Falha ao renovar o token do Google:", response.status, body?.error);
    return reply({ error: "google" }, 502);
  }

  return reply({ access_token: body.access_token, expires_in: body.expires_in });
}

/** Ao sair, não deixa acesso ao Drive guardado. */
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return reply({ error: "reconnect" }, 401);

  const { error } = await createAdminClient().from("google_tokens").delete().eq("user_id", userId);
  if (error) {
    console.error("Falha ao apagar o token do Google:", error.message);
    return reply({ error: "storage" }, 500);
  }
  return reply({ ok: true });
}
