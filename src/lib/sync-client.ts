export const MIN_CLIENT_SYNC_KEY_LENGTH = 4;
export const RECOMMENDED_SYNC_KEY_LENGTH = 8;

export async function hashSyncKey(rawKey: string): Promise<string> {
  const trimmed = rawKey.trim();
  if (!trimmed) return "";

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(`appcraft-v1:${trimmed}`);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256:${hex}`;
  }

  return trimmed;
}
