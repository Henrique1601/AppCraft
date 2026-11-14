export function getHostname(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return null;
  }
}

export function getGitHubOwner(repoUrl?: string): string | null {
  if (!repoUrl) return null;
  try {
    const parsed = new URL(repoUrl.startsWith("http") ? repoUrl : `https://${repoUrl}`);
    if (!parsed.hostname.includes("github.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

export function resolveAppIconUrl(app: {
  iconUrl?: string;
  websiteUrl?: string;
  repoUrl?: string;
}): string | null {
  if (app.iconUrl && app.iconUrl.trim()) {
    return app.iconUrl.trim();
  }

  const host = getHostname(app.websiteUrl);
  if (host) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  }

  const ghOwner = getGitHubOwner(app.repoUrl);
  if (ghOwner) {
    return `https://github.com/${encodeURIComponent(ghOwner)}.png?size=128`;
  }

  return null;
}

const AVATAR_GRADIENTS = [
  "from-indigo-500/30 to-violet-500/30 text-indigo-300 border-indigo-500/30",
  "from-emerald-500/30 to-teal-500/30 text-emerald-300 border-emerald-500/30",
  "from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-500/30",
  "from-sky-500/30 to-cyan-500/30 text-sky-300 border-sky-500/30",
  "from-rose-500/30 to-pink-500/30 text-rose-300 border-rose-500/30",
];

export function getInitialsStyle(name: string): {
  initials: string;
  gradientClass: string;
} {
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase() || "AP";

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;

  return {
    initials,
    gradientClass: AVATAR_GRADIENTS[index],
  };
}
