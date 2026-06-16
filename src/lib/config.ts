// URL pública do app. Atualize após o primeiro publish.
// Se vazio, /qr usa window.location.origin em runtime.
export const PUBLISHED_URL = "https://project-mirror-helper.lovable.app";

export function getPublicAppUrl(): string {
  if (PUBLISHED_URL) return PUBLISHED_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
