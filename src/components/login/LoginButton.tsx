"use client";

import { signIn } from "@/lib/supabase/useUser";

export function LoginButton() {
  return (
    <button type="button" className="pill login-button" onClick={signIn}>
      Entrar com Google
    </button>
  );
}
