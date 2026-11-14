import { NextResponse } from "next/server";

interface GitHubRepoResponse {
  name?: string;
  description?: string | null;
  homepage?: string | null;
  topics?: unknown[];
}

interface GitHubReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

function parseGitHubRepoUrl(
  rawUrl: string | null
): { owner: string; repo: string } | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");

  const validSegment = /^[A-Za-z0-9._-]+$/;
  if (!owner || !repo || !validSegment.test(owner) || !validSegment.test(repo)) {
    return null;
  }

  return { owner, repo };
}

function normalizeWebsiteUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function pickBestDownloadUrl(
  release: GitHubReleaseResponse | null
): string | undefined {
  if (!release) return undefined;
  const assets = Array.isArray(release.assets) ? release.assets : [];

  const installerExt = /\.(exe|msi|msix|appx|zip|7z)$/i;
  const preferred = assets.find(
    (asset) =>
      typeof asset.name === "string" &&
      installerExt.test(asset.name) &&
      typeof asset.browser_download_url === "string"
  );

  if (preferred?.browser_download_url) {
    return preferred.browser_download_url;
  }

  const firstAsset = assets.find(
    (asset) => typeof asset.browser_download_url === "string"
  );
  if (firstAsset?.browser_download_url) {
    return firstAsset.browser_download_url;
  }

  return typeof release.html_url === "string" ? release.html_url : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseGitHubRepoUrl(searchParams.get("url"));

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "URL do GitHub inválida. Use o formato https://github.com/usuario/repositorio.",
      },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "AppCraft-Catalog",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(
    parsed.owner
  )}/${encodeURIComponent(parsed.repo)}`;

  try {
    const [repoRes, releaseRes] = await Promise.all([
      fetch(baseUrl, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/releases/latest`, { headers, cache: "no-store" }),
    ]);

    if (repoRes.status === 404) {
      return NextResponse.json(
        { error: "Repositório não encontrado no GitHub." },
        { status: 404 }
      );
    }

    if (!repoRes.ok) {
      return NextResponse.json(
        {
          error: `Erro ao consultar a API do GitHub (HTTP ${repoRes.status}).`,
        },
        { status: 502 }
      );
    }

    const repoData = (await repoRes.json()) as GitHubRepoResponse;

    let releaseData: GitHubReleaseResponse | null = null;
    if (releaseRes.ok) {
      releaseData = (await releaseRes.json()) as GitHubReleaseResponse;
    }

    const tags = Array.isArray(repoData.topics)
      ? repoData.topics
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    return NextResponse.json({
      name: typeof repoData.name === "string" ? repoData.name : parsed.repo,
      description:
        typeof repoData.description === "string" && repoData.description.trim()
          ? repoData.description.trim()
          : undefined,
      websiteUrl: normalizeWebsiteUrl(repoData.homepage),
      version:
        typeof releaseData?.tag_name === "string" && releaseData.tag_name.trim()
          ? releaseData.tag_name.trim()
          : undefined,
      downloadUrl: pickBestDownloadUrl(releaseData),
      tags,
    });
  } catch (error) {
    console.error("[GET /api/github] Fetch error:", error);
    return NextResponse.json(
      { error: "Falha de rede ao consultar o GitHub." },
      { status: 500 }
    );
  }
}
