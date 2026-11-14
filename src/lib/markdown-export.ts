import { AppItem, AppStatus, STATUS_CONFIG } from "@/types/app";

const STATUS_PRIORITY: Record<AppStatus, number> = {
  favorite: 0,
  installed: 1,
  wishlist: 2,
  archived: 3,
};

function getLocalDateStamp(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildCatalogMarkdown(
  apps: AppItem[],
  categories: string[],
  dateStr = getLocalDateStamp()
): string {
  const byCategory = new Map<string, AppItem[]>();

  for (const app of apps) {
    const category = app.category.trim() || "Outros";
    const list = byCategory.get(category);
    if (list) {
      list.push(app);
    } else {
      byCategory.set(category, [app]);
    }
  }

  const orderedCategories: string[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    if (byCategory.has(cat) && !seen.has(cat)) {
      orderedCategories.push(cat);
      seen.add(cat);
    }
  }

  const remaining = Array.from(byCategory.keys())
    .filter((cat) => !seen.has(cat))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  orderedCategories.push(...remaining);

  const lines: string[] = [
    "# AppCraft — Catálogo de Aplicativos",
    "",
    `> Gerado em ${dateStr} · ${apps.length} ${
      apps.length === 1 ? "aplicativo" : "aplicativos"
    }`,
    "",
  ];

  if (orderedCategories.length === 0) {
    lines.push("_Nenhum aplicativo cadastrado no catálogo._", "");
    return lines.join("\n");
  }

  for (const category of orderedCategories) {
    const categoryApps = [...(byCategory.get(category) ?? [])].sort((a, b) => {
      const priorityDiff =
        STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    lines.push(`## ${category} (${categoryApps.length})`, "");

    for (const app of categoryApps) {
      const statusLabel = STATUS_CONFIG[app.status]?.label ?? app.status;
      const versionPart = app.version?.trim() ? ` \`v${app.version.trim().replace(/^v/i, "")}\`` : "";
      lines.push(`### ${app.name}${versionPart} — _${statusLabel}_`, "");

      if (app.description?.trim()) {
        lines.push(app.description.trim(), "");
      }

      const details: string[] = [];
      const links: string[] = [];
      if (app.websiteUrl?.trim()) links.push(`[Site](${app.websiteUrl.trim()})`);
      if (app.repoUrl?.trim()) links.push(`[Repositório](${app.repoUrl.trim()})`);
      if (app.downloadUrl?.trim()) links.push(`[Download](${app.downloadUrl.trim()})`);

      if (links.length > 0) {
        details.push(`- **Links:** ${links.join(" · ")}`);
      }
      if (app.installCommand?.trim()) {
        details.push(`- **Instalação:** \`${app.installCommand.trim()}\``);
      }
      if (app.stacks && app.stacks.length > 0) {
        details.push(`- **Stacks:** ${app.stacks.join(", ")}`);
      }
      if (app.tags && app.tags.length > 0) {
        details.push(`- **Tags:** ${app.tags.join(", ")}`);
      }
      if (app.notes?.trim()) {
        details.push(`- **Notas:** ${app.notes.trim().replace(/\r?\n/g, " ")}`);
      }

      if (details.length > 0) {
        lines.push(...details, "");
      }
    }
  }

  return lines.join("\n");
}

export function exportCatalogToMarkdown(
  apps: AppItem[],
  categories: string[]
): boolean {
  if (apps.length === 0) {
    return false;
  }

  const dateStr = getLocalDateStamp();
  const markdown = buildCatalogMarkdown(apps, categories, dateStr);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appcraft-catalog-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
