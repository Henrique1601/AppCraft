"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Star,
  Terminal,
} from "lucide-react";
import { AppItem, STATUS_CONFIG } from "@/types/app";
import { AppIcon } from "./AppIcon";

interface AppTableProps {
  apps: AppItem[];
  onSelect: (app: AppItem) => void;
  onToggleFavorite: (app: AppItem) => void;
  selectedIds: Set<string>;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
}

export function AppTable({
  apps,
  onSelect,
  onToggleFavorite,
  selectedIds,
  selectionMode,
  onToggleSelect,
}: AppTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCommand = async (e: React.MouseEvent, app: AppItem) => {
    e.stopPropagation();
    if (!app.installCommand) return;
    try {
      await navigator.clipboard.writeText(app.installCommand);
      setCopiedId(app.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === app.id ? null : prev));
      }, 1500);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#111114]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/50 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              <th className="w-10 px-3 py-2.5" />
              <th className="px-3 py-2.5">Aplicativo</th>
              <th className="px-3 py-2.5">Categoria</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {apps.map((app) => {
              const selected = selectedIds.has(app.id);
              const statusMeta = STATUS_CONFIG[app.status];
              const isFav = app.status === "favorite";

              return (
                <tr
                  key={app.id}
                  onClick={() => {
                    if (selectionMode) {
                      onToggleSelect(app.id);
                    } else {
                      onSelect(app);
                    }
                  }}
                  className={`group cursor-pointer transition-colors ${
                    selected
                      ? "bg-indigo-950/25 hover:bg-indigo-950/35"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(app.id);
                      }}
                      aria-label={
                        selected ? `Desmarcar ${app.name}` : `Selecionar ${app.name}`
                      }
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-600 text-white opacity-100"
                          : selectionMode
                            ? "border-zinc-600 bg-zinc-900 text-transparent opacity-100 hover:border-indigo-400"
                            : "border-zinc-700 bg-zinc-900 text-transparent opacity-40 group-hover:opacity-100 hover:border-indigo-400"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <AppIcon
                        name={app.name}
                        iconUrl={app.iconUrl}
                        websiteUrl={app.websiteUrl}
                        repoUrl={app.repoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-zinc-100">
                            {app.name}
                          </span>
                          {app.version && (
                            <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                              {app.version}
                            </span>
                          )}
                        </div>
                        {app.description && (
                          <p className="max-w-xs truncate text-[11px] text-zinc-500">
                            {app.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">
                    {app.category}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                      />
                      {statusMeta.label}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {app.installCommand && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyCommand(e, app)}
                          title={`Copiar: ${app.installCommand}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
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
                          title="Abrir site oficial"
                          className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
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
                          title="Abrir repositório"
                          className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(app);
                        }}
                        title={
                          isFav
                            ? "Remover dos favoritos"
                            : "Marcar como favorito"
                        }
                        className={`rounded-lg p-1.5 transition-colors ${
                          isFav
                            ? "text-amber-400 hover:bg-amber-500/10"
                            : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400" : ""}`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
