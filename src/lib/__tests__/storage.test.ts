import { describe, expect, it } from "vitest";
import { normalizeAppItem, parseImportedCatalog } from "@/lib/storage";
import { AppItem, DEFAULT_CATEGORIES } from "@/types/app";

function makeApp(overrides: Partial<AppItem> = {}): AppItem {
  return {
    id: "app-1",
    name: "VS Code",
    category: "Dev & Terminal",
    status: "installed",
    tags: ["editor"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeAppItem", () => {
  it("returns null when name is missing or whitespace", () => {
    expect(normalizeAppItem({})).toBeNull();
    expect(normalizeAppItem({ name: "   " })).toBeNull();
  });

  it("trims fields, applies defaults, and normalizes URLs", () => {
    const result = normalizeAppItem({
      name: "  Obsidian  ",
      category: "  ",
      status: "invalid-status" as AppItem["status"],
      websiteUrl: "obsidian.md",
      repoUrl: "http://github.com/obsidianmd/obsidian-releases",
      downloadUrl: "  ",
      installCommand: "  winget install Obsidian.Obsidian  ",
      tags: [" notes ", "notes", "", "markdown"],
      stacks: [" Dev Stack ", "Dev Stack", ""],
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Obsidian");
    expect(result?.id).toMatch(/^obsidian-[a-z0-9]+$/);
    expect(result?.category).toBe("Utilitários");
    expect(result?.status).toBe("installed");
    expect(result?.websiteUrl).toBe("https://obsidian.md");
    expect(result?.repoUrl).toBe("http://github.com/obsidianmd/obsidian-releases");
    expect(result?.downloadUrl).toBeUndefined();
    expect(result?.installCommand).toBe("winget install Obsidian.Obsidian");
    expect(result?.tags).toEqual(["notes", "markdown"]);
    expect(result?.stacks).toEqual(["Dev Stack"]);
  });

  it("preserves valid id, status, and sets empty stacks to undefined", () => {
    const result = normalizeAppItem({
      id: "custom-id",
      name: "Git",
      status: "favorite",
      stacks: ["  "],
    });

    expect(result?.id).toBe("custom-id");
    expect(result?.status).toBe("favorite");
    expect(result?.stacks).toBeUndefined();
  });
});

describe("parseImportedCatalog", () => {
  it("throws on invalid JSON or empty/invalid apps payload", () => {
    expect(() => parseImportedCatalog("{bad", [], [], "merge")).toThrow();
    expect(() => parseImportedCatalog(JSON.stringify({ apps: [] }), [], [], "merge")).toThrow(
      /Nenhum app válido/
    );
    expect(() =>
      parseImportedCatalog(JSON.stringify([{ category: "Dev" }]), [], [], "merge")
    ).toThrow(/obrigatório 'name'/);
  });

  it("replaces catalog and merges DEFAULT_CATEGORIES in replace mode", () => {
    const existing = [makeApp({ id: "old-1", name: "Old App" })];
    const json = JSON.stringify({
      categories: ["Custom Cat"],
      apps: [
        { name: "Neovim", category: "Dev & Terminal", status: "favorite", tags: ["cli"] },
        { name: "Figma", category: "Design", status: "wishlist", stacks: ["Mídia & Design"] },
      ],
    });

    const result = parseImportedCatalog(json, existing, ["Ignored Cat"], "replace");

    expect(result.addedCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(result.apps.map((a) => a.name)).toEqual(["Neovim", "Figma"]);
    expect(result.categories).toEqual(
      expect.arrayContaining([...DEFAULT_CATEGORIES, "Custom Cat", "Design"])
    );
    expect(result.categories).not.toContain("Ignored Cat");
  });

  it("merges existing and incoming apps case-insensitively in merge mode", () => {
    const existing = [
      makeApp({
        id: "existing-vscode-id",
        name: "VS Code",
        notes: "Existing note",
        websiteUrl: "https://code.visualstudio.com",
        tags: ["editor", "microsoft"],
        stacks: ["Dev Stack"],
      }),
    ];

    const json = JSON.stringify({
      categories: ["Extra Cat"],
      apps: [
        {
          id: "incoming-different-id",
          name: "vs code",
          status: "favorite",
          installCommand: "winget install Microsoft.VisualStudioCode",
          tags: ["microsoft", "ide"],
          stacks: ["Pós-Formatação", "Dev Stack"],
        },
        {
          name: "7-Zip",
          category: "Utilitários",
          status: "installed",
        },
      ],
    });

    const result = parseImportedCatalog(
      json,
      existing,
      ["Dev & Terminal", "Custom Existing"],
      "merge"
    );

    expect(result.updatedCount).toBe(1);
    expect(result.addedCount).toBe(1);
    expect(result.apps).toHaveLength(2);

    const mergedVsCode = result.apps.find((a) => a.name.toLowerCase() === "vs code");
    expect(mergedVsCode?.id).toBe("existing-vscode-id");
    expect(mergedVsCode?.status).toBe("favorite");
    expect(mergedVsCode?.notes).toBe("Existing note");
    expect(mergedVsCode?.websiteUrl).toBe("https://code.visualstudio.com");
    expect(mergedVsCode?.installCommand).toBe("winget install Microsoft.VisualStudioCode");
    expect(mergedVsCode?.tags).toEqual(["editor", "microsoft", "ide"]);
    expect(mergedVsCode?.stacks).toEqual(["Dev Stack", "Pós-Formatação"]);

    expect(result.categories).toEqual([
      "Dev & Terminal",
      "Custom Existing",
      "Extra Cat",
      "Utilitários",
    ]);
  });
});
