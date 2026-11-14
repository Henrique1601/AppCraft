"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Star,
  Terminal,
} from "lucide-react";
import { AppItem, STATUS_CONFIG } from "@/types/app";
import { AppIcon } from "./AppIcon";

interface AppCardProps {
  app: AppItem;
  onSelect: (app: AppItem) => void;
  onToggleFavorite: (app: AppItem) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function AppCard({
  app,
  onSelect,
  onToggleFavorite,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: AppCardProps) {
  const [copied, setCopied] = useState(false);
  const statusMeta = STATUS_CONFIG[app.status];
  const isFav = app.status === "favorite";

  const handleCopyCommand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app.installCommand) return;
    try {
      await navigator.clipboard.writeText(app.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(app.id);
      return;
    }
    onSelect(app);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
        selected
          ? "border-indigo-500/70 bg-indigo-950/20 ring-1 ring-indigo-500/30"
          : "border-zinc-800/80 bg-[#111114] hover:border-zinc-700 hover:bg-[#151519] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
      }`}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(app.id);
          }}
          aria-label={selected ? `Desmarcar ${app.name}` : `Selecionar ${app.name}`}
          className={`absolute left-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
            selected
              ? "border-indigo-500 bg-indigo-600 text-white opacity-100"
              : selectionMode
                ? "border-zinc-600 bg-zinc-900/95 text-transparent opacity-100 hover:border-indigo-400"
                : "border-zinc-700 bg-zinc-900/95 text-transparent opacity-0 group-hover:opacity-100 hover:border-indigo-400"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon
              name={app.name}
              iconUrl={app.iconUrl}
              websiteUrl={app.websiteUrl}
              repoUrl={app.repoUrl}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
                  {app.name}
                </h3>
                {app.version && (
                  <span className="shrink-0 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {app.version}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {app.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(app);
            }}
            title={isFav ? "Remover dos favoritos" : "Marcar como favorito"}
            className={`shrink-0 rounded-lg p-1.5 transition-colors ${
              isFav
                ? "text-amber-400 hover:bg-amber-500/10"
                : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            <Star className={`h-4 w-4 ${isFav ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        {app.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
            {app.description}
          </p>
        )}

        {app.notes && (
          <p className="mt-2 line-clamp-1 rounded-lg border border-zinc-800/70 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] text-zinc-400">
            <span className="text-zinc-500">Nota:</span> {app.notes}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {app.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {app.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
              >
                #{tag}
              </span>
            ))}
            {app.tags.length > 3 && (
              <span className="rounded-md bg-zinc-800/40 px-1.5 py-0.5 text-[10px] text-zinc-500">
                +{app.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </span>

          <div className="flex items-center gap-1">
            {app.installCommand && (
              <button
                type="button"
                onClick={handleCopyCommand}
                title={`Copiar: ${app.installCommand}`}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
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

            {app.downloadUrl && (
              <a
                href={app.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Link direto de download"
                className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
