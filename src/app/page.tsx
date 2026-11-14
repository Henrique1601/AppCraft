"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus, Search, Sparkles } from "lucide-react";
import { AppCard } from "@/components/AppCard";
import { AppModal } from "@/components/AppModal";
import { BulkActionBar } from "@/components/BulkActionBar";
import { CloudSyncModal } from "@/components/CloudSyncModal";
import { CommandPalette } from "@/components/CommandPalette";
import { ScanGuideModal } from "@/components/ScanGuideModal";
import { Sidebar } from "@/components/Sidebar";
import { SEED_APPS } from "@/data/seed";
import {
  exportCatalogToJson,
  loadCatalog,
  parseImportedCatalog,
  saveApps,
  saveCategories,
} from "@/lib/storage";
import {
  AppItem,
  AppStatus,
  DEFAULT_CATEGORIES,
  DEFAULT_STACKS,
} from "@/types/app";

type SortMode = "favorites" | "name" | "recent";

export default function HomePage() {
  const [apps, setApps] = useState<AppItem[]>(SEED_APPS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [hydrated, setHydrated] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<AppStatus | "all">("all");
  const [selectedStack, setSelectedStack] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("favorites");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scanGuideOpen, setScanGuideOpen] = useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    app: AppItem | null;
  }>({ open: false, app: null });
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    queueMicrotask(() => {
      const { apps: storedApps, categories: storedCats } = loadCatalog();
      setApps(storedApps);
      setCategories(storedCats);
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
  }, [apps, selectedCategory, selectedStatus, selectedStack, searchQuery, sortMode]);

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
    setApps((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setModalState({ open: false, app: null });
    if (target) showToast(`"${target.name}" removido.`);
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
    setApps((prev) => prev.filter((app) => !selectedIds.has(app.id)));
    setSelectedIds(new Set());
    showToast(`${count} ${count === 1 ? "app removido" : "apps removidos"}.`);
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

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
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
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                {selectedCategory === "all"
                  ? "Todos os Aplicativos"
                  : selectedCategory}
              </h2>
              <p className="text-xs text-zinc-500">
                {filteredApps.length}{" "}
                {filteredApps.length === 1 ? "app exibido" : "apps exibidos"}
                {selectedStatus !== "all" || selectedStack !== "all"
                  ? ` · filtro ativo`
                  : ""}
              </p>
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
          setApps(cloudApps);
          setCategories(cloudCategories);
          setSelectedIds(new Set());
        }}
        onNotify={showToast}
      />

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

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 text-xs font-medium text-zinc-100 shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}
