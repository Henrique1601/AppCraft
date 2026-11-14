"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Plus,
  Search,
  Terminal,
} from "lucide-react";
import { AppItem } from "@/types/app";
import { AppIcon } from "./AppIcon";

interface CommandPaletteProps {
  open: boolean;
  apps: AppItem[];
  onClose: () => void;
  onSelectApp: (app: AppItem) => void;
  onNewApp: () => void;
}

export function CommandPalette({
  open,
  apps,
  onClose,
  onSelectApp,
  onNewApp,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps.slice(0, 10);
    return apps
      .filter((app) => {
        const haystack = [
          app.name,
          app.category,
          app.description ?? "",
          app.notes ?? "",
          app.installCommand ?? "",
          ...app.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [apps, query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          results.length > 0 ? (prev + 1) % results.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          results.length > 0
            ? (prev - 1 + results.length) % results.length
            : 0
        );
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        onSelectApp(results[activeIndex]);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, activeIndex, onClose, onSelectApp]);

  if (!open) return null;

  const handleCopy = async (e: React.MouseEvent, app: AppItem) => {
    e.stopPropagation();
    if (!app.installCommand) return;
    await navigator.clipboard.writeText(app.installCommand);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar app, categoria, tag ou comando winget..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">
                Nenhum app encontrado para &ldquo;{query}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewApp();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar novo app
              </button>
            </div>
          ) : (
            results.map((app, index) => {
              const isSelected = index === activeIndex;
              return (
                <div
                  key={app.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelectApp(app);
                    onClose();
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isSelected ? "bg-zinc-800/90" : "hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AppIcon
                      name={app.name}
                      iconUrl={app.iconUrl}
                      websiteUrl={app.websiteUrl}
                      repoUrl={app.repoUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {app.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {app.category}
                        {app.description ? ` · ${app.description}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {app.installCommand && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, app)}
                        title="Copiar comando de instalação"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300 hover:bg-zinc-800"
                      >
                        {copiedId === app.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <>
                            <Terminal className="h-3 w-3 text-zinc-400" />
                            <Copy className="h-2.5 w-2.5 text-zinc-500" />
                          </>
                        )}
                      </button>
                    )}
                    {app.websiteUrl && (
                      <a
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Site Oficial"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {app.repoUrl && (
                      <a
                        href={app.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Repositório"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-2 text-[11px] text-zinc-500">
          <span>↑↓ navegar · Enter editar/detalhes</span>
          <span>Ctrl+K para abrir</span>
        </div>
      </div>
    </div>
  );
}
