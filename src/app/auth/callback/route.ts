import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const home = new URL("/", request.nextUrl.origin);
  const failed = new URL("/login?erro=1", request.nextUrl.origin);
  if (!code) return NextResponse.redirect(failed);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Falha ao trocar o código de login:", error.message);
    return NextResponse.redirect(failed);
  }

  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    const { error: saveError } = await createAdminClient()
      .from("google_tokens")
      .upsert({ user_id: data.user.id, refresh_token: refreshToken, updated_at: new Date().toISOString() });
    if (saveError) console.error("Falha ao guardar o token do Google:", saveError.message);
  }

  return NextResponse.redirect(home);
}
