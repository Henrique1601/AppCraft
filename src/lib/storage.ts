import { SEED_APPS } from "@/data/seed";
import {
  AppCatalogExport,
  AppItem,
  AppStatus,
  DEFAULT_CATEGORIES,
} from "@/types/app";

const APPS_KEY = "appcraft:apps:v1";
const CATEGORIES_KEY = "appcraft:categories:v1";

const VALID_STATUSES: AppStatus[] = [
  "installed",
  "favorite",
  "wishlist",
  "archived",
];

function safeStatus(status: unknown): AppStatus {
  if (typeof status === "string" && VALID_STATUSES.includes(status as AppStatus)) {
    return status as AppStatus;
  }
  return "installed";
}

function normalizeUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeAppItem(raw: Partial<AppItem> & { name?: string }): AppItem | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;

  const now = new Date().toISOString();
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return {
    id,
    name,
    category:
      typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim()
        : "Utilitários",
    status: safeStatus(raw.status),
    websiteUrl: normalizeUrl(raw.websiteUrl),
    repoUrl: normalizeUrl(raw.repoUrl),
    downloadUrl: normalizeUrl(raw.downloadUrl),
    installCommand:
      typeof raw.installCommand === "string" && raw.installCommand.trim()
        ? raw.installCommand.trim()
        : undefined,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : undefined,
    notes:
      typeof raw.notes === "string" && raw.notes.trim()
        ? raw.notes.trim()
        : undefined,
    version:
      typeof raw.version === "string" && raw.version.trim()
        ? raw.version.trim()
        : undefined,
    iconUrl: normalizeUrl(raw.iconUrl),
    tags: Array.from(new Set(tags)),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

export function loadCatalog(): { apps: AppItem[]; categories: string[] } {
  if (typeof window === "undefined") {
    return { apps: SEED_APPS, categories: DEFAULT_CATEGORIES };
  }

  try {
    const rawApps = localStorage.getItem(APPS_KEY);
    const rawCats = localStorage.getItem(CATEGORIES_KEY);

    const apps: AppItem[] = rawApps ? JSON.parse(rawApps) : SEED_APPS;
    const categories: string[] = rawCats
      ? JSON.parse(rawCats)
      : DEFAULT_CATEGORIES;

    return {
      apps: Array.isArray(apps) ? apps : SEED_APPS,
      categories: Array.isArray(categories) && categories.length > 0
        ? categories
        : DEFAULT_CATEGORIES,
    };
  } catch {
    return { apps: SEED_APPS, categories: DEFAULT_CATEGORIES };
  }
}

export function saveApps(apps: AppItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPS_KEY, JSON.stringify(apps));
}

export function saveCategories(categories: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function exportCatalogToJson(apps: AppItem[], categories: string[]): void {
  const payload: AppCatalogExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    apps,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `appcraft-catalog-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseImportedCatalog(
  jsonText: string,
  existingApps: AppItem[],
  existingCategories: string[],
  mode: "merge" | "replace"
): { apps: AppItem[]; categories: string[]; addedCount: number; updatedCount: number } {
  const parsed = JSON.parse(jsonText);
  const rawApps: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.apps)
      ? parsed.apps
      : [];

  if (!Array.isArray(rawApps) || rawApps.length === 0) {
    throw new Error("Nenhum app válido encontrado no arquivo JSON.");
  }

  const normalized = rawApps
    .map((item) => normalizeAppItem(item as Partial<AppItem>))
    .filter((item): item is AppItem => item !== null);

  if (normalized.length === 0) {
    throw new Error("Os itens do JSON não possuem o campo obrigatório 'name'.");
  }

  const importedCats: string[] = Array.isArray(parsed?.categories)
    ? parsed.categories.map((c: unknown) => String(c).trim()).filter(Boolean)
    : [];

  const appCats = normalized.map((a) => a.category);

  if (mode === "replace") {
    const mergedCats = Array.from(
      new Set([...DEFAULT_CATEGORIES, ...importedCats, ...appCats])
    );
    return {
      apps: normalized,
      categories: mergedCats,
      addedCount: normalized.length,
      updatedCount: 0,
    };
  }

  const byKey = new Map<string, AppItem>();
  for (const app of existingApps) {
    byKey.set(app.name.toLowerCase(), app);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const incoming of normalized) {
    const key = incoming.name.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        ...incoming,
        id: existing.id,
        notes: incoming.notes || existing.notes,
        websiteUrl: incoming.websiteUrl || existing.websiteUrl,
        repoUrl: incoming.repoUrl || existing.repoUrl,
        installCommand: incoming.installCommand || existing.installCommand,
        tags: Array.from(new Set([...existing.tags, ...incoming.tags])),
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
    } else {
      byKey.set(key, incoming);
      addedCount++;
    }
  }

  const mergedCats = Array.from(
    new Set([...existingCategories, ...importedCats, ...appCats])
  );

  return {
    apps: Array.from(byKey.values()),
    categories: mergedCats,
    addedCount,
    updatedCount,
  };
}
