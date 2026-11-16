"use client";

import { useMemo } from "react";
import { CheckCircle2, GitMerge, Sparkles, X } from "lucide-react";
import { DuplicateGroup, findDuplicateGroups } from "@/lib/duplicates";
import { AppItem, STATUS_CONFIG } from "@/types/app";
import { AppIcon } from "./AppIcon";

interface DuplicatesModalProps {
  open: boolean;
  apps: AppItem[];
  onClose: () => void;
  onMergeGroup: (group: DuplicateGroup) => void;
  onMergeAll: (groups: DuplicateGroup[]) => void;
}

export function DuplicatesModal({
  open,
  apps,
  onClose,
  onMergeGroup,
  onMergeAll,
}: DuplicatesModalProps) {
  const groups = useMemo(() => findDuplicateGroups(apps), [apps]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <GitMerge className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Detector de Duplicados
              </h2>
              <p className="text-xs text-zinc-500">
                Mescle apps repetidos mantendo links, notas, tags e comandos winget
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-zinc-200">
                Nenhum app duplicado encontrado!
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Seu catálogo está limpo e sem entradas com nomes repetidos.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.key}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-semibold text-zinc-100">
                      {group.label}
                    </span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                      {group.apps.length} itens
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMergeGroup(group)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-500"
                  >
                    <GitMerge className="h-3 w-3" />
                    Mesclar grupo
                  </button>
                </div>

                <div className="space-y-1.5">
                  {group.apps.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AppIcon
                          name={item.name}
                          iconUrl={item.iconUrl}
                          websiteUrl={item.websiteUrl}
                          repoUrl={item.repoUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-zinc-200">{item.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {item.category}
                            {item.installCommand ? " · winget" : ""}
                            {item.websiteUrl ? " · site" : ""}
                            {item.repoUrl ? " · repo" : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CONFIG[item.status].badgeClass}`}
                      >
                        {STATUS_CONFIG[item.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {groups.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-800/80 px-5 py-3.5">
            <span className="text-xs text-zinc-400">
              {groups.length}{" "}
              {groups.length === 1 ? "grupo duplicado" : "grupos duplicados"}
            </span>
            <button
              type="button"
              onClick={() => onMergeAll(groups)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mesclar todos ({groups.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
