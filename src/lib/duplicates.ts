import { AppItem, AppStatus } from "@/types/app";

const STATUS_PRIORITY: Record<AppStatus, number> = {
  favorite: 0,
  installed: 1,
  wishlist: 2,
  archived: 3,
};

export function normalizeAppBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(x64|x86|amd64|arm64|64-?bit|32-?bit|setup|installer|portable|user|machine)\b/gi, " ")
    .replace(/\bv?\d+(\.\d+){1,4}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface DuplicateGroup {
  key: string;
  label: string;
  apps: AppItem[];
}

export function findDuplicateGroups(apps: AppItem[]): DuplicateGroup[] {
  const buckets = new Map<string, AppItem[]>();

  for (const app of apps) {
    const key = normalizeAppBaseName(app.name);
    if (!key) continue;
    const list = buckets.get(key) ?? [];
    list.push(app);
    buckets.set(key, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, list] of buckets.entries()) {
    if (list.length >= 2) {
      const sorted = [...list].sort(
        (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
      );
      groups.push({
        key,
        label: sorted[0].name,
        apps: sorted,
      });
    }
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

export function mergeAppGroup(group: AppItem[]): AppItem {
  const sorted = [...group].sort((a, b) => {
    const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (statusDiff !== 0) return statusDiff;
    const score = (item: AppItem) =>
      (item.websiteUrl ? 2 : 0) +
      (item.repoUrl ? 2 : 0) +
      (item.installCommand ? 2 : 0) +
      (item.description ? 1 : 0);
    return score(b) - score(a);
  });

  const primary = sorted[0];
  const mergedNotes = Array.from(
    new Set(sorted.map((a) => a.notes?.trim()).filter((n): n is string => Boolean(n)))
  ).join("\n\n");

  const mergedTags = Array.from(
    new Set(sorted.flatMap((a) => a.tags ?? []).map((t) => t.trim()).filter(Boolean))
  );

  const mergedStacks = Array.from(
    new Set(sorted.flatMap((a) => a.stacks ?? []).map((s) => s.trim()).filter(Boolean))
  );

  return {
    ...primary,
    websiteUrl: sorted.find((a) => a.websiteUrl)?.websiteUrl,
    repoUrl: sorted.find((a) => a.repoUrl)?.repoUrl,
    downloadUrl: sorted.find((a) => a.downloadUrl)?.downloadUrl,
    installCommand: sorted.find((a) => a.installCommand)?.installCommand,
    description: sorted.find((a) => a.description)?.description,
    version: sorted.find((a) => a.version)?.version,
    iconUrl: sorted.find((a) => a.iconUrl)?.iconUrl,
    notes: mergedNotes || undefined,
    tags: mergedTags,
    stacks: mergedStacks.length > 0 ? mergedStacks : undefined,
    updatedAt: new Date().toISOString(),
  };
}
