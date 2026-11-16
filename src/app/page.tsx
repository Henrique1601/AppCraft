"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Menu, Plus, RotateCcw, Search, Sparkles, Upload } from "lucide-react";
import { AppCard } from "@/components/AppCard";
import { AppModal } from "@/components/AppModal";
import { AppTable } from "@/components/AppTable";
import { BulkActionBar } from "@/components/BulkActionBar";
import { CloudSyncModal } from "@/components/CloudSyncModal";
import { CommandPalette } from "@/components/CommandPalette";
import { DuplicatesModal } from "@/components/DuplicatesModal";
import { ScanGuideModal } from "@/components/ScanGuideModal";
import { Sidebar, SyncStatus } from "@/components/Sidebar";
import { SEED_APPS } from "@/data/seed";
import { DuplicateGroup, mergeAppGroup } from "@/lib/duplicates";
import {
  exportCatalogToJson,
  loadCatalog,
  parseImportedCatalog,
  saveApps,
  saveCategories,
} from "@/lib/storage";
import { hashSyncKey } from "@/lib/sync-client";
import {
  AppItem,
  AppStatus,
  DEFAULT_CATEGORIES,
  DEFAULT_STACKS,
} from "@/types/app";

type SortMode = "favorites" | "name" | "recent";
type ViewMode = "grid" | "table";
type HealthFilter = "all" | "no-website" | "no-repo" | "no-winget" | "hd-installer";

const INSTALLER_EXTENSIONS = /\.(exe|msi|zip|7z|msix)$/i;

function cleanInstallerName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExt
    .replace(/[-_]+/g, " ")
    .replace(/\b(setup|installer|install|x64|x86|amd64|win64|win32|portable)\b/gi, " ")
    .replace(/\bv?\d+(?:\.\d+){1,3}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || withoutExt;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function HomePage() {
  const [apps, setApps] = useState<AppItem[]>(SEED_APPS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [hydrated, setHydrated] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<AppStatus | "all">("all");
  const [selectedStack, setSelectedStack] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("favorites");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scanGuideOpen, setScanGuideOpen] = useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    app: AppItem | null;
  }>({ open: false, app: null });
  const [toast, setToast] = useState<{
    message: string;
    undoApps?: AppItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextAutoSyncRef = useRef(true);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string, undoApps?: AppItem[]) => {
    setToast({ message: msg, undoApps });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, undoApps ? 6000 : 3200);
  };

  useEffect(() => {
    queueMicrotask(() => {
      const { apps: storedApps, categories: storedCats } = loadCatalog();
      setApps(storedApps);
      setCategories(storedCats);
      setAutoSyncEnabled(localStorage.getItem("appcraft:auto-sync") === "true");
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveApps(apps);
  }, [apps, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCategories(categories);
  }, [categories, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      return;
    }
    if (!autoSyncEnabled) return;
    const syncKey = localStorage.getItem("appcraft:sync-key")?.trim() ?? "";
    if (syncKey.length < 8) return;

    const timer = window.setTimeout(async () => {
      setSyncStatus("syncing");
      try {
        const hashedKey = await hashSyncKey(syncKey);
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syncKey: hashedKey,
            payload: {
              version: 1,
              exportedAt: new Date().toISOString(),
              categories,
              apps,
            },
          }),
        });
        if (!res.ok) throw new Error("Sync failed");
        const data = await res.json();
        if (data?.updatedAt) {
          localStorage.setItem("appcraft:last-sync", String(data.updatedAt));
        }
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [apps, categories, hydrated, autoSyncEnabled]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const availableStacks = useMemo(() => {
    const customStacks = apps.flatMap((app) => app.stacks ?? []);
    return Array.from(new Set([...DEFAULT_STACKS, ...customStacks]));
  }, [apps]);

  const healthCounts = useMemo(
    () => ({
      "no-website": apps.filter((a) => !a.websiteUrl).length,
      "no-repo": apps.filter((a) => !a.repoUrl).length,
      "no-winget": apps.filter((a) => !a.installCommand).length,
      "hd-installer": apps.filter((a) => a.tags.includes("hd-installer")).length,
    }),
    [apps]
  );

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = apps.filter((app) => {
      if (selectedCategory !== "all" && app.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== "all" && app.status !== selectedStatus) {
        return false;
      }
      if (selectedStack !== "all" && !app.stacks?.includes(selectedStack)) {
        return false;
      }
      if (healthFilter === "no-website" && app.websiteUrl) return false;
      if (healthFilter === "no-repo" && app.repoUrl) return false;
      if (healthFilter === "no-winget" && app.installCommand) return false;
      if (healthFilter === "hd-installer" && !app.tags.includes("hd-installer")) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        app.name,
        app.category,
        app.description ?? "",
        app.notes ?? "",
        app.installCommand ?? "",
        app.websiteUrl ?? "",
        app.repoUrl ?? "",
        ...app.tags,
        ...(app.stacks ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...list].sort((a, b) => {
      if (sortMode === "favorites") {
        const aFav = a.status === "favorite" ? 0 : 1;
        const bFav = b.status === "favorite" ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return a.name.localeCompare(b.name);
      }
      if (sortMode === "recent") {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    apps,
    selectedCategory,
    selectedStatus,
    selectedStack,
    healthFilter,
    searchQuery,
    sortMode,
  ]);

  const handleSaveApp = (
    data: Omit<AppItem, "id" | "createdAt" | "updatedAt">,
    existingId?: string
  ) => {
    const now = new Date().toISOString();

    if (!categories.includes(data.category)) {
      setCategories((prev) => [...prev, data.category]);
    }

    if (existingId) {
      setApps((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...item, ...data, updatedAt: now } : item
        )
      );
      showToast(`"${data.name}" atualizado.`);
    } else {
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const newApp: AppItem = {
        ...data,
        id: `${slug || "app"}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      setApps((prev) => [newApp, ...prev]);
      showToast(`"${data.name}" adicionado ao catálogo.`);
    }

    setModalState({ open: false, app: null });
  };

  const handleDeleteApp = (id: string) => {
    const target = apps.find((a) => a.id === id);
    const snapshot = apps;
    setApps((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setModalState({ open: false, app: null });
    if (target) showToast(`"${target.name}" removido.`, snapshot);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds(new Set(filteredApps.map((app) => app.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkMoveCategory = (category: string) => {
    const count = selectedIds.size;
    if (count === 0) return;
    const now = new Date().toISOString();
    setApps((prev) =>
      prev.map((app) =>
        selectedIds.has(app.id) ? { ...app, category, updatedAt: now } : app
      )
    );
    setSelectedIds(new Set());
    showToast(`${count} ${count === 1 ? "app movido" : "apps movidos"} para "${category}".`);
  };

  const handleBulkSetStatus = (status: AppStatus) => {
    const count = selectedIds.size;
    if (count === 0) return;
    const now = new Date().toISOString();
    setApps((prev) =>
      prev.map((app) =>
        selectedIds.has(app.id) ? { ...app, status, updatedAt: now } : app
      )
    );
    setSelectedIds(new Set());
    showToast(`Status atualizado em ${count} ${count === 1 ? "app" : "apps"}.`);
  };

  const handleBulkAddToStack = (stack: string) => {
    const count = selectedIds.size;
    if (count === 0) return;
    const now = new Date().toISOString();
    setApps((prev) =>
      prev.map((app) => {
        if (!selectedIds.has(app.id)) return app;
        const nextStacks = Array.from(new Set([...(app.stacks ?? []), stack]));
        return { ...app, stacks: nextStacks, updatedAt: now };
      })
    );
    setSelectedIds(new Set());
    showToast(`${count} ${count === 1 ? "app adicionado" : "apps adicionados"} ao stack "${stack}".`);
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const snapshot = apps;
    setApps((prev) => prev.filter((app) => !selectedIds.has(app.id)));
    setSelectedIds(new Set());
    showToast(`${count} ${count === 1 ? "app removido" : "apps removidos"}.`, snapshot);
  };

  const handleMergeDuplicateGroup = (group: DuplicateGroup) => {
    const snapshot = apps;
    const merged = mergeAppGroup(group.apps);
    const removeIds = new Set(group.apps.map((a) => a.id));
    setApps((prev) => [merged, ...prev.filter((a) => !removeIds.has(a.id))]);
    showToast(`"${merged.name}" mesclado (${group.apps.length} itens).`, snapshot);
  };

  const handleMergeAllDuplicates = (groups: DuplicateGroup[]) => {
    if (groups.length === 0) return;
    const snapshot = apps;
    const removeIds = new Set<string>();
    const mergedItems: AppItem[] = [];
    for (const group of groups) {
      mergedItems.push(mergeAppGroup(group.apps));
      for (const item of group.apps) removeIds.add(item.id);
    }
    setApps((prev) => [...mergedItems, ...prev.filter((a) => !removeIds.has(a.id))]);
    setDuplicatesOpen(false);
    showToast(`${groups.length} grupos de duplicados mesclados.`, snapshot);
  };

  const handleToggleFavorite = (app: AppItem) => {
    const nextStatus: AppStatus =
      app.status === "favorite" ? "installed" : "favorite";
    setApps((prev) =>
      prev.map((item) =>
        item.id === app.id
          ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const handleAddCategory = (name: string) => {
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      showToast("Essa categoria já existe.");
      return;
    }
    setCategories((prev) => [...prev, name]);
    setSelectedCategory(name);
    showToast(`Categoria "${name}" criada.`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseImportedCatalog(text, apps, categories, "merge");
      setApps(result.apps);
      setCategories(result.categories);
      showToast(
        `Importação concluída: ${result.addedCount} novos, ${result.updatedCount} atualizados.`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao importar arquivo JSON."
      );
    }
  };

  const handleResetSeed = () => {
    setApps(SEED_APPS);
    setCategories(DEFAULT_CATEGORIES);
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedStack("all");
    setSelectedIds(new Set());
    setSearchQuery("");
    showToast("Catálogo de exemplo restaurado.");
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFiles(false);
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFiles(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      INSTALLER_EXTENSIONS.test(file.name)
    );
    if (droppedFiles.length === 0) {
      showToast("Nenhum instalador suportado (.exe, .msi, .zip, .7z, .msix).");
      return;
    }

    const now = new Date().toISOString();
    const existingNames = new Set(apps.map((a) => a.name.toLowerCase()));
    const added: AppItem[] = [];

    for (const file of droppedFiles) {
      const appName = cleanInstallerName(file.name);
      if (existingNames.has(appName.toLowerCase())) continue;
      existingNames.add(appName.toLowerCase());

      const slug = appName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      added.push({
        id: `${slug || "installer"}-${Math.random().toString(36).slice(2, 6)}`,
        name: appName,
        category: "Utilitários",
        status: "installed",
        tags: ["hd-installer"],
        notes: `Instalador local: ${file.name} (${formatFileSize(file.size)})`,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (added.length === 0) {
      showToast("Esses instaladores já estão no catálogo.");
      return;
    }

    setApps((prev) => [...added, ...prev]);
    showToast(
      `${added.length} ${added.length === 1 ? "instalador adicionado" : "instaladores adicionados"} ao catálogo.`
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFiles}
      className="relative flex min-h-screen bg-[#09090b] text-zinc-100"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      <Sidebar
        apps={apps}
        categories={categories}
        stacks={availableStacks}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        selectedStack={selectedStack}
        syncStatus={syncStatus}
        onSelectCategory={setSelectedCategory}
        onSelectStatus={setSelectedStatus}
        onSelectStack={setSelectedStack}
        onAddCategory={handleAddCategory}
        onOpenNewApp={() => setModalState({ open: true, app: null })}
        onExportJson={() => {
          exportCatalogToJson(apps, categories);
          showToast("Catálogo exportado em JSON.");
        }}
        onImportClick={() => fileInputRef.current?.click()}
        onOpenScanGuide={() => setScanGuideOpen(true)}
        onOpenCloudSync={() => setCloudSyncOpen(true)}
        onOpenDuplicates={() => setDuplicatesOpen(true)}
        onResetSeed={handleResetSeed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090b]/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nome, tag, link ou winget..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#111114] py-2 pl-9 pr-16 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  title="Abrir busca rápida (Ctrl+K)"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                >
                  Ctrl+K
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-zinc-800 bg-[#111114] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Visualização em grade"
                  aria-label="Visualização em grade"
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Visualização em tabela"
                  aria-label="Visualização em tabela"
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === "table"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="hidden sm:block rounded-xl border border-zinc-800 bg-[#111114] px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="favorites">Favoritos primeiro</option>
                <option value="name">Nome (A-Z)</option>
                <option value="recent">Atualizados recentemente</option>
              </select>

              <button
                type="button"
                onClick={() => setModalState({ open: true, app: null })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                  {selectedCategory === "all"
                    ? "Todos os Aplicativos"
                    : selectedCategory}
                </h2>
                <p className="text-xs text-zinc-500">
                  {filteredApps.length}{" "}
                  {filteredApps.length === 1 ? "app exibido" : "apps exibidos"}
                  {selectedStatus !== "all" ||
                  selectedStack !== "all" ||
                  healthFilter !== "all"
                    ? ` · filtro ativo`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all" as const, label: "Tudo", count: apps.length },
                  { id: "no-website" as const, label: "Sem Site", count: healthCounts["no-website"] },
                  { id: "no-repo" as const, label: "Sem Repo", count: healthCounts["no-repo"] },
                  { id: "no-winget" as const, label: "Sem Winget", count: healthCounts["no-winget"] },
                  { id: "hd-installer" as const, label: "Instaladores HD", count: healthCounts["hd-installer"] },
                ] as const
              ).map((chip) => {
                const active = healthFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setHealthFilter(chip.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                        : "border-zinc-800 bg-[#111114] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-[#111114]/60 px-6 py-16 text-center">
              <Sparkles className="h-8 w-8 text-zinc-600" />
              <h3 className="mt-3 text-sm font-medium text-zinc-200">
                Nenhum app encontrado aqui
              </h3>
              <p className="mt-1 max-w-sm text-xs text-zinc-500">
                Tente limpar os filtros, cadastrar um app manualmente ou rodar o
                script de escaneamento do seu Windows.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                    setSelectedStack("all");
                    setHealthFilter("all");
                    setSearchQuery("");
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Limpar filtros
                </button>
                <button
                  type="button"
                  onClick={() => setModalState({ open: true, app: null })}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  + Novo App
                </button>
              </div>
            </div>
          ) : viewMode === "table" ? (
            <AppTable
              apps={filteredApps}
              onSelect={(item) => setModalState({ open: true, app: item })}
              onToggleFavorite={handleToggleFavorite}
              selectedIds={selectedIds}
              selectionMode={selectedIds.size > 0}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onSelect={(item) => setModalState({ open: true, app: item })}
                  onToggleFavorite={handleToggleFavorite}
                  selected={selectedIds.has(app.id)}
                  selectionMode={selectedIds.size > 0}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {modalState.open && (
        <AppModal
          app={modalState.app}
          categories={categories}
          availableStacks={availableStacks}
          onClose={() => setModalState({ open: false, app: null })}
          onSave={handleSaveApp}
          onDelete={handleDeleteApp}
        />
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalVisibleCount={filteredApps.length}
        categories={categories}
        stacks={availableStacks}
        onSelectAllVisible={handleSelectAllVisible}
        onClearSelection={handleClearSelection}
        onMoveCategory={handleBulkMoveCategory}
        onSetStatus={handleBulkSetStatus}
        onAddToStack={handleBulkAddToStack}
        onDeleteSelected={handleBulkDelete}
      />

      <CloudSyncModal
        open={cloudSyncOpen}
        onClose={() => setCloudSyncOpen(false)}
        apps={apps}
        categories={categories}
        onApplyCloudData={(cloudApps, cloudCategories) => {
          skipNextAutoSyncRef.current = true;
          setApps(cloudApps);
          setCategories(cloudCategories);
          setSelectedIds(new Set());
        }}
        onAutoSyncChange={setAutoSyncEnabled}
        onNotify={showToast}
      />

      {isDraggingFiles && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/50 backdrop-blur-xs border-2 border-dashed border-indigo-400">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-indigo-500/40 bg-[#111114]/95 px-8 py-6 text-center shadow-2xl">
            <Upload className="h-8 w-8 text-indigo-400" />
            <p className="text-sm font-semibold text-zinc-100">
              Solte os instaladores aqui
            </p>
            <p className="text-xs text-zinc-400">
              Suporta .exe, .msi, .zip, .7z e .msix (leitura local sem upload)
            </p>
          </div>
        </div>
      )}

      {paletteOpen && (
        <CommandPalette
          open={paletteOpen}
          apps={apps}
          onClose={() => setPaletteOpen(false)}
          onSelectApp={(app) => setModalState({ open: true, app })}
          onNewApp={() => setModalState({ open: true, app: null })}
        />
      )}

      <ScanGuideModal
        open={scanGuideOpen}
        onClose={() => setScanGuideOpen(false)}
        onImportClick={() => fileInputRef.current?.click()}
      />

      <DuplicatesModal
        open={duplicatesOpen}
        apps={apps}
        onClose={() => setDuplicatesOpen(false)}
        onMergeGroup={handleMergeDuplicateGroup}
        onMergeAll={handleMergeAllDuplicates}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 text-xs font-medium text-zinc-100 shadow-xl backdrop-blur-md">
          <span>{toast.message}</span>
          {toast.undoApps && (
            <button
              type="button"
              onClick={() => {
                setApps(toast.undoApps!);
                setToast(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500"
            >
              <RotateCcw className="h-3 w-3" />
              Desfazer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
