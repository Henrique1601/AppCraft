import { describe, expect, it } from "vitest";
import {
  getGitHubOwner,
  getHostname,
  getInitialsStyle,
  resolveAppIconUrl,
} from "@/lib/icons";

describe("getHostname", () => {
  it("extracts hostname with or without protocol and returns null for invalid URLs", () => {
    expect(getHostname("https://code.visualstudio.com/download")).toBe("code.visualstudio.com");
    expect(getHostname("obsidian.md")).toBe("obsidian.md");
    expect(getHostname("")).toBeNull();
    expect(getHostname("://bad url")).toBeNull();
  });
});

describe("getGitHubOwner", () => {
  it("extracts owner from valid GitHub repository URLs", () => {
    expect(getGitHubOwner("https://github.com/vercel/next.js")).toBe("vercel");
    expect(getGitHubOwner("github.com/microsoft/vscode")).toBe("microsoft");
  });

  it("returns null for non-GitHub URLs, missing owner, or empty input", () => {
    expect(getGitHubOwner(undefined)).toBeNull();
    expect(getGitHubOwner("https://gitlab.com/group/project")).toBeNull();
    expect(getGitHubOwner("https://github.com/")).toBeNull();
  });
});

describe("resolveAppIconUrl", () => {
  it("prefers explicit iconUrl over websiteUrl and repoUrl", () => {
    expect(
      resolveAppIconUrl({
        iconUrl: "  https://cdn.example.com/icon.png  ",
        websiteUrl: "https://example.com",
        repoUrl: "https://github.com/example/app",
      })
    ).toBe("https://cdn.example.com/icon.png");
  });

  it("falls back to Google favicon service for websiteUrl", () => {
    expect(
      resolveAppIconUrl({
        websiteUrl: "https://obsidian.md",
        repoUrl: "https://github.com/obsidianmd/obsidian-releases",
      })
    ).toBe("https://www.google.com/s2/favicons?domain=obsidian.md&sz=128");
  });

  it("falls back to GitHub owner avatar when only repoUrl is present", () => {
    expect(
      resolveAppIconUrl({
        repoUrl: "https://github.com/neovim/neovim",
      })
    ).toBe("https://github.com/neovim.png?size=128");
  });

  it("returns null when no valid icon source exists", () => {
    expect(resolveAppIconUrl({})).toBeNull();
    expect(resolveAppIconUrl({ repoUrl: "https://gitlab.com/a/b" })).toBeNull();
  });
});

describe("getInitialsStyle", () => {
  it("computes initials for multi-word, single-word, and empty names", () => {
    expect(getInitialsStyle("Visual Studio Code").initials).toBe("VS");
    expect(getInitialsStyle("obsidian").initials).toBe("OB");
    expect(getInitialsStyle("x").initials).toBe("X");
    expect(getInitialsStyle("   ").initials).toBe("AP");
  });

  it("returns deterministic gradient classes from the palette", () => {
    const first = getInitialsStyle("AppCraft");
    const second = getInitialsStyle("AppCraft");
    expect(first.gradientClass).toBe(second.gradientClass);
    expect(first.gradientClass).toContain("from-");
  });
});
