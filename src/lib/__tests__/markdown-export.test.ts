import { describe, expect, it } from "vitest";
import { buildCatalogMarkdown, exportCatalogToMarkdown } from "@/lib/markdown-export";
import { AppItem } from "@/types/app";

function makeApp(overrides: Partial<AppItem> = {}): AppItem {
  return {
    id: "app-1",
    name: "App",
    category: "Utilitários",
    status: "installed",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildCatalogMarkdown", () => {
  it("renders empty-state markdown when there are no apps", () => {
    const md = buildCatalogMarkdown([], ["Dev & Terminal"], "2026-11-14");
    expect(md).toContain("# AppCraft — Catálogo de Aplicativos");
    expect(md).toContain("> Gerado em 2026-11-14 · 0 aplicativos");
    expect(md).toContain("_Nenhum aplicativo cadastrado no catálogo._");
  });

  it("orders categories by provided list then remaining alphabetically, and sorts apps by status priority then name", () => {
    const apps = [
      makeApp({ id: "1", name: "Zed", category: "Extra B", status: "installed" }),
      makeApp({ id: "2", name: "Alpha", category: "Extra A", status: "installed" }),
      makeApp({ id: "3", name: "OldApp", category: "Dev & Terminal", status: "archived" }),
      makeApp({ id: "4", name: "Git", category: "Dev & Terminal", status: "installed" }),
      makeApp({ id: "5", name: "Neovim", category: "Dev & Terminal", status: "favorite" }),
      makeApp({ id: "6", name: "NoCat", category: "   ", status: "wishlist" }),
    ];

    const md = buildCatalogMarkdown(apps, ["Dev & Terminal", "Empty Cat"], "2026-11-14");

    expect(md).toContain("> Gerado em 2026-11-14 · 6 aplicativos");
    expect(md).not.toContain("Empty Cat");

    const idxDev = md.indexOf("## Dev & Terminal (3)");
    const idxExtraA = md.indexOf("## Extra A (1)");
    const idxExtraB = md.indexOf("## Extra B (1)");
    const idxOutros = md.indexOf("## Outros (1)");

    expect(idxDev).toBeGreaterThan(-1);
    expect(idxDev).toBeLessThan(idxExtraA);
    expect(idxExtraA).toBeLessThan(idxExtraB);
    expect(idxExtraB).toBeLessThan(idxOutros);

    const idxNeovim = md.indexOf("### Neovim — _Favorito_");
    const idxGit = md.indexOf("### Git — _Instalado_");
    const idxOld = md.indexOf("### OldApp — _Arquivado_");
    expect(idxNeovim).toBeLessThan(idxGit);
    expect(idxGit).toBeLessThan(idxOld);
  });

  it("renders version, description, links, installCommand, stacks, tags, and single-line notes", () => {
    const apps = [
      makeApp({
        name: "VS Code",
        category: "Dev & Terminal",
        status: "favorite",
        version: "v1.95.0",
        description: "Editor de código extensible.",
        websiteUrl: "https://code.visualstudio.com",
        repoUrl: "https://github.com/microsoft/vscode",
        downloadUrl: "https://code.visualstudio.com/download",
        installCommand: "winget install Microsoft.VisualStudioCode",
        stacks: ["Dev Stack", "Pós-Formatação"],
        tags: ["editor", "ide"],
        notes: "Linha 1\nLinha 2",
      }),
    ];

    const md = buildCatalogMarkdown(apps, ["Dev & Terminal"], "2026-11-14");

    expect(md).toContain("> Gerado em 2026-11-14 · 1 aplicativo");
    expect(md).toContain("### VS Code `v1.95.0` — _Favorito_");
    expect(md).toContain("Editor de código extensible.");
    expect(md).toContain(
      "- **Links:** [Site](https://code.visualstudio.com) · [Repositório](https://github.com/microsoft/vscode) · [Download](https://code.visualstudio.com/download)"
    );
    expect(md).toContain("- **Instalação:** `winget install Microsoft.VisualStudioCode`");
    expect(md).toContain("- **Stacks:** Dev Stack, Pós-Formatação");
    expect(md).toContain("- **Tags:** editor, ide");
    expect(md).toContain("- **Notas:** Linha 1 Linha 2");
  });
});

describe("exportCatalogToMarkdown", () => {
  it("returns false when apps array is empty", () => {
    expect(exportCatalogToMarkdown([], ["Utilitários"])).toBe(false);
  });
});
