import { AppItem, AppStatus } from "@/types/app";

const STATUS_PRIORITY: Record<Exclude<AppStatus, "archived">, number> = {
  favorite: 0,
  installed: 1,
  wishlist: 2,
};

const STATUS_TAG: Record<Exclude<AppStatus, "archived">, string> = {
  favorite: "Favorito",
  installed: "Instalado",
  wishlist: "Testar depois",
};

function getLocalDateStamp(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapePsSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function slugifyStackName(stackName: string): string {
  return stackName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildReinstallScript(
  apps: AppItem[],
  stackName?: string,
  dateStr = getLocalDateStamp()
): string | null {
  const activeStack = stackName && stackName !== "all" ? stackName.trim() : undefined;
  const scopedApps = activeStack
    ? apps.filter((app) => app.stacks?.includes(activeStack))
    : apps;

  const eligible = scopedApps.filter(
    (app): app is AppItem & { status: Exclude<AppStatus, "archived">; installCommand: string } =>
      app.status !== "archived" && Boolean(app.installCommand?.trim())
  );

  if (eligible.length === 0) {
    return null;
  }

  const sorted = [...eligible].sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const byCategory = new Map<string, typeof sorted>();
  for (const app of sorted) {
    const category = app.category.trim() || "Outros";
    const list = byCategory.get(category);
    if (list) {
      list.push(app);
    } else {
      byCategory.set(category, [app]);
    }
  }

  const lines: string[] = [
    "# ============================================================================",
    "# AppCraft - Script de Reinstalacao (.ps1)",
    ...(activeStack ? [`# Perfil / Stack: ${activeStack}`] : []),
    `# Gerado em: ${dateStr}`,
    `# Aplicativos incluidos: ${sorted.length} (favoritos e instalados priorizados; arquivados ignorados)`,
    "# Execute no PowerShell (como Administrador quando necessario).",
    "# ============================================================================",
    "",
    "$ErrorActionPreference = 'Continue'",
    "",
  ];

  for (const [category, categoryApps] of byCategory.entries()) {
    const safeCategory = escapePsSingleQuoted(category);
    lines.push(`# === ${category} ===`);
    lines.push(`Write-Host ''`);
    lines.push(`Write-Host '=== ${safeCategory} ===' -ForegroundColor Cyan`);

    for (const app of categoryApps) {
      const safeName = escapePsSingleQuoted(app.name);
      const tag = STATUS_TAG[app.status];
      const command = app.installCommand.trim();
      lines.push(`# ${app.name} [${tag}]`);
      lines.push(`Write-Host '-> Instalando ${safeName} (${tag})...' -ForegroundColor Green`);
      lines.push(command);
    }

    lines.push("");
  }

  lines.push("Write-Host ''");
  lines.push("Write-Host 'Reinstalacao concluida!' -ForegroundColor Cyan");
  lines.push("");

  return lines.join("\r\n");
}

export function exportReinstallScript(apps: AppItem[], stackName?: string): boolean {
  const dateStr = getLocalDateStamp();
  const activeStack = stackName && stackName !== "all" ? stackName.trim() : undefined;
  const script = buildReinstallScript(apps, activeStack, dateStr);
  if (!script) {
    return false;
  }

  const stackSlug = activeStack ? slugifyStackName(activeStack) : "";
  const filename = stackSlug
    ? `appcraft-reinstall-${stackSlug}-${dateStr}.ps1`
    : `appcraft-reinstall-${dateStr}.ps1`;

  const blob = new Blob(["\uFEFF" + script], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return true;
}
