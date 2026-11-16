import { describe, expect, it } from "vitest";
import {
  findDuplicateGroups,
  mergeAppGroup,
  normalizeAppBaseName,
} from "@/lib/duplicates";
import { AppItem } from "@/types/app";

const baseApp = (overrides: Partial<AppItem>): AppItem => ({
  id: "1",
  name: "Git",
  category: "Dev & Terminal",
  status: "installed",
  tags: [],
  createdAt: "2026-11-14T00:00:00Z",
  updatedAt: "2026-11-14T00:00:00Z",
  ...overrides,
});

describe("duplicates", () => {
  it("normalizes version numbers and installer suffixes", () => {
    expect(normalizeAppBaseName("Git 2.56.0 (64-bit)")).toBe("git");
    expect(normalizeAppBaseName("Git-2.56.0-x64-setup")).toBe("git");
    expect(normalizeAppBaseName("Visual Studio Code (User)")).toBe(
      "visual studio code"
    );
  });

  it("groups duplicate apps and ignores unique ones", () => {
    const apps = [
      baseApp({ id: "1", name: "Git", status: "favorite", websiteUrl: "https://git-scm.com" }),
      baseApp({ id: "2", name: "Git-2.56.0-64-bit", tags: ["hd-installer"], notes: "D:\\Git.exe" }),
      baseApp({ id: "3", name: "Obsidian" }),
    ];

    const groups = findDuplicateGroups(apps);
    expect(groups).toHaveLength(1);
    expect(groups[0].apps).toHaveLength(2);
  });

  it("merges duplicate group preserving richest fields, tags, and notes", () => {
    const group = [
      baseApp({
        id: "1",
        name: "Git",
        status: "favorite",
        websiteUrl: "https://git-scm.com",
        installCommand: "winget install Git.Git",
        tags: ["dev"],
        stacks: ["Dev Stack"],
      }),
      baseApp({
        id: "2",
        name: "Git 2.56.0",
        status: "installed",
        repoUrl: "https://github.com/git/git",
        notes: "Instalador em D:\\Instaladores",
        tags: ["hd-installer"],
        stacks: ["Pós-Formatação"],
      }),
    ];

    const merged = mergeAppGroup(group);
    expect(merged.name).toBe("Git");
    expect(merged.status).toBe("favorite");
    expect(merged.websiteUrl).toBe("https://git-scm.com");
    expect(merged.repoUrl).toBe("https://github.com/git/git");
    expect(merged.installCommand).toBe("winget install Git.Git");
    expect(merged.notes).toContain("D:\\Instaladores");
    expect(merged.tags).toEqual(["dev", "hd-installer"]);
    expect(merged.stacks).toEqual(["Dev Stack", "Pós-Formatação"]);
  });
});
