export class ReconnectError extends Error {}

let cached: { token: string; expiresAt: number } | null = null;

export function clearAccessToken() {
  cached = null;
}

export async function getAccessToken() {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const response = await fetch("/api/google/token", { cache: "no-store" });
  if (response.status === 401) throw new ReconnectError();
  if (!response.ok) throw new Error(`Token do Google indisponível (${response.status})`);

  const { access_token, expires_in } = await response.json();
  cached = { token: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token as string;
}
