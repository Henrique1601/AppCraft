"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Bookmark,
  Boxes,
  Check,
  CheckCircle2,
  Cloud,
  Download,
  FileCode2,
  FolderPlus,
  HardDrive,
  Layers,
  Plus,
  RotateCcw,
  Star,
  TerminalSquare,
  Upload,
  X,
} from "lucide-react";
import { AppItem, AppStatus, DEFAULT_STACKS } from "@/types/app";
import { exportReinstallScript } from "@/lib/reinstall-script";

interface SidebarProps {
  apps: AppItem[];
  categories: string[];
  stacks?: string[];
  selectedCategory: string;
  selectedStatus: AppStatus | "all";
  selectedStack: string;
  onSelectCategory: (cat: string) => void;
  onSelectStatus: (status: AppStatus | "all") => void;
  onSelectStack: (stack: string) => void;
  onAddCategory: (name: string) => void;
  onOpenNewApp: () => void;
  onExportJson: () => void;
  onImportClick: () => void;
  onOpenScanGuide: () => void;
  onOpenCloudSync: () => void;
  onResetSeed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  apps,
  categories,
  stacks = DEFAULT_STACKS,
  selectedCategory,
  selectedStatus,
  selectedStack,
  onSelectCategory,
  onSelectStatus,
  onSelectStack,
  onAddCategory,
  onOpenNewApp,
  onExportJson,
  onImportClick,
  onOpenScanGuide,
  onOpenCloudSync,
  onResetSeed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [reinstallFeedback, setReinstallFeedback] = useState<"downloaded" | "empty" | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleExportReinstall = () => {
    const ok = exportReinstallScript(
      apps,
      selectedStack !== "all" ? selectedStack : undefined
    );
    setReinstallFeedback(ok ? "downloaded" : "empty");
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setReinstallFeedback(null);
      feedbackTimerRef.current = null;
    }, 2500);
  };

  const stackCounts = stacks.reduce<Record<string, number>>((acc, stack) => {
    acc[stack] = apps.filter((a) => a.stacks?.includes(stack)).length;
    return acc;
  }, {});

  const statusCounts = {
    all: apps.length,
    favorite: apps.filter((a) => a.status === "favorite").length,
    installed: apps.filter((a) => a.status === "installed").length,
    wishlist: apps.filter((a) => a.status === "wishlist").length,
    archived: apps.filter((a) => a.status === "archived").length,
  };

  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = apps.filter((a) => a.category === cat).length;
    return acc;
  }, {});

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCatName("");
    setAddingCat(false);
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-[#0c0c0f] border-r border-zinc-800/80 w-64 select-none">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                AppCraft
              </h1>
              <p className="text-[11px] text-zinc-500">
                {apps.length} {apps.length === 1 ? "app catalogado" : "apps catalogados"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => {
            onOpenNewApp();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo App
        </button>

        {/* Status Section */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Status
          </p>
          {[
            { id: "all" as const, label: "Todos os apps", icon: Layers, count: statusCounts.all },
            { id: "favorite" as const, label: "Favoritos", icon: Star, count: statusCounts.favorite },
            { id: "installed" as const, label: "Instalados", icon: CheckCircle2, count: statusCounts.installed },
            { id: "wishlist" as const, label: "Testar depois", icon: Bookmark, count: statusCounts.wishlist },
            { id: "archived" as const, label: "Arquivados", icon: Archive, count: statusCounts.archived },
          ].map((item) => {
            const Icon = item.icon;
            const active = selectedStatus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectStatus(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-zinc-800/90 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-zinc-400" />
                  {item.label}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Perfis / Stacks Section */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Perfis / Stacks
          </p>
          <button
            type="button"
            onClick={() => {
              onSelectStack("all");
              onCloseMobile();
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              selectedStack === "all"
                ? "bg-zinc-800/90 text-zinc-100 font-medium"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Boxes className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Todos os perfis</span>
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              {apps.length}
            </span>
          </button>

          {stacks.map((stack) => {
            const active = selectedStack === stack;
            return (
              <button
                key={stack}
                type="button"
                onClick={() => {
                  onSelectStack(stack);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className="truncate">{stack}</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {stackCounts[stack] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Categories Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Categorias
            </p>
            <button
              type="button"
              onClick={() => setAddingCat((v) => !v)}
              title="Nova categoria"
              className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {addingCat && (
            <form onSubmit={handleCreateCategory} className="px-1 py-1">
              <input
                type="text"
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nome da categoria..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectCategory("all");
              onCloseMobile();
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              selectedCategory === "all"
                ? "bg-zinc-800/90 text-zinc-100 font-medium"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span className="truncate">Todas as categorias</span>
            <span className="font-mono text-[11px] text-zinc-500">
              {apps.length}
            </span>
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onSelectCategory(cat);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-zinc-800/90 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className="truncate">{cat}</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Utilities */}
      <div className="border-t border-zinc-800/80 p-3 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            onOpenCloudSync();
            onCloseMobile();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-2 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
        >
          <Cloud className="h-3.5 w-3.5" />
          Sync Nuvem
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenScanGuide();
            onCloseMobile();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          <TerminalSquare className="h-3.5 w-3.5" />
          Escanear Apps do PC (.ps1)
        </button>

        <button
          type="button"
          onClick={handleExportReinstall}
          title={
            selectedStack !== "all"
              ? `Exportar script .ps1 apenas para o stack "${selectedStack}"`
              : "Exportar script .ps1 de reinstalação"
          }
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
            reinstallFeedback === "downloaded"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : reinstallFeedback === "empty"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            {reinstallFeedback === "downloaded" ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <FileCode2 className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {reinstallFeedback === "downloaded"
                ? "Baixado!"
                : reinstallFeedback === "empty"
                  ? "Sem comandos"
                  : selectedStack !== "all"
                    ? `Script: ${selectedStack} (.ps1)`
                    : "Script de Reinstalação (.ps1)"}
            </span>
          </span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onImportClick}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            <Upload className="h-3 w-3" />
            Importar
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            <Download className="h-3 w-3" />
            Exportar
          </button>
        </div>

        <button
          type="button"
          onClick={onResetSeed}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar catálogo exemplo
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
