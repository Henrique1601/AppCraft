import { describe, expect, it } from "vitest";
import { buildReinstallScript } from "@/lib/reinstall-script";
import { AppItem } from "@/types/app";

function makeApp(overrides: Partial<AppItem> = {}): AppItem {
  return {
    id: "id-1",
    name: "App",
    category: "Utilitários",
    status: "installed",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildReinstallScript", () => {
  it("returns null when no eligible non-archived apps have installCommand", () => {
    const apps = [
      makeApp({ name: "NoCmd", status: "favorite" }),
      makeApp({ name: "BlankCmd", status: "installed", installCommand: "   " }),
      makeApp({ name: "ArchivedApp", status: "archived", installCommand: "winget install Foo.Bar" }),
    ];

    expect(buildReinstallScript(apps, undefined, "2026-11-14")).toBeNull();
  });

  it("filters archived apps and sorts by priority (favorite > installed > wishlist) then name", () => {
    const apps = [
      makeApp({
        id: "w1",
        name: "Zed",
        category: "Dev & Terminal",
        status: "wishlist",
        installCommand: "winget install Zed.Zed",
      }),
      makeApp({
        id: "i1",
        name: "Git",
        category: "Dev & Terminal",
        status: "installed",
        installCommand: "winget install Git.Git",
      }),
      makeApp({
        id: "f2",
        name: "VS Code",
        category: "Dev & Terminal",
        status: "favorite",
        installCommand: "winget install Microsoft.VisualStudioCode",
      }),
      makeApp({
        id: "f1",
        name: "Alacritty",
        category: "Dev & Terminal",
        status: "favorite",
        installCommand: "winget install Alacritty.Alacritty",
      }),
      makeApp({
        id: "a1",
        name: "Archived",
        category: "Dev & Terminal",
        status: "archived",
        installCommand: "winget install Old.App",
      }),
    ];

    const script = buildReinstallScript(apps, undefined, "2026-11-14");
    expect(script).not.toBeNull();
    expect(script).toContain("# Gerado em: 2026-11-14");
    expect(script).toContain("# Aplicativos incluidos: 4");
    expect(script).not.toContain("Archived");
    expect(script).not.toContain("# Perfil / Stack:");

    const idxAlacritty = script!.indexOf("winget install Alacritty.Alacritty");
    const idxVsCode = script!.indexOf("winget install Microsoft.VisualStudioCode");
    const idxGit = script!.indexOf("winget install Git.Git");
    const idxZed = script!.indexOf("winget install Zed.Zed");

    expect(idxAlacritty).toBeGreaterThan(-1);
    expect(idxAlacritty).toBeLessThan(idxVsCode);
    expect(idxVsCode).toBeLessThan(idxGit);
    expect(idxGit).toBeLessThan(idxZed);
  });

  it("filters by stackName and annotates the header, ignoring 'all'", () => {
    const apps = [
      makeApp({
        id: "1",
        name: "Git",
        status: "favorite",
        stacks: ["Dev Stack", "Pós-Formatação"],
        installCommand: "winget install Git.Git",
      }),
      makeApp({
        id: "2",
        name: "Blender",
        status: "installed",
        stacks: ["Mídia & Design"],
        installCommand: "winget install BlenderFoundation.Blender",
      }),
    ];

    const devScript = buildReinstallScript(apps, "Dev Stack", "2026-11-14");
    expect(devScript).toContain("# Perfil / Stack: Dev Stack");
    expect(devScript).toContain("# Aplicativos incluidos: 1");
    expect(devScript).toContain("winget install Git.Git");
    expect(devScript).not.toContain("Blender");

    expect(buildReinstallScript(apps, "Nonexistent Stack", "2026-11-14")).toBeNull();

    const allScript = buildReinstallScript(apps, "all", "2026-11-14");
    expect(allScript).toContain("# Aplicativos incluidos: 2");
    expect(allScript).not.toContain("# Perfil / Stack:");
  });

  it("escapes single quotes in PowerShell Write-Host strings and uses CRLF", () => {
    const apps = [
      makeApp({
        name: "Bob's Tool",
        category: "Dev's Tools",
        status: "installed",
        installCommand: "winget install Bob.Tool",
      }),
    ];

    const script = buildReinstallScript(apps, undefined, "2026-11-14");
    expect(script).toContain("Write-Host '=== Dev''s Tools ===' -ForegroundColor Cyan");
    expect(script).toContain("Write-Host '-> Instalando Bob''s Tool (Instalado)...' -ForegroundColor Green");
    expect(script).toContain("\r\n");
  });
});
