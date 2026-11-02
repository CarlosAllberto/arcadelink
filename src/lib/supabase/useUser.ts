"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { DRIVE_SCOPE } from "@/lib/google/scope";
import { clearAccessToken } from "@/lib/google/token";
import { createClient } from "./client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}

export function signIn() {
  return createClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${location.origin}/auth/callback`,
      scopes: DRIVE_SCOPE,
      // Sem isso o Google não envia refresh token.
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

export async function signOut() {
  await fetch("/api/google/token", { method: "DELETE" });
  clearAccessToken();
  await createClient().auth.signOut();
}
