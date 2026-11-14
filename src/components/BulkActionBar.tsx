"use client";

import { useState } from "react";
import { CheckSquare, Trash2, X } from "lucide-react";
import { AppStatus, STATUS_CONFIG } from "@/types/app";

interface BulkActionBarProps {
  selectedCount: number;
  totalVisibleCount: number;
  categories: string[];
  stacks: string[];
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onMoveCategory: (category: string) => void;
  onSetStatus: (status: AppStatus) => void;
  onAddToStack: (stack: string) => void;
  onDeleteSelected: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalVisibleCount,
  categories,
  stacks,
  onSelectAllVisible,
  onClearSelection,
  onMoveCategory,
  onSetStatus,
  onAddToStack,
  onDeleteSelected,
}: BulkActionBarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-zinc-700/80 bg-[#131318]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedCount} {selectedCount === 1 ? "selecionado" : "selecionados"}
          </span>

          {selectedCount < totalVisibleCount && (
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Selecionar todos ({totalVisibleCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onClearSelection();
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Mover para categoria"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onMoveCategory(e.target.value);
              }
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="" disabled>
              Mover categoria...
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Definir status"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onSetStatus(e.target.value as AppStatus);
              }
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="" disabled>
              Definir status...
            </option>
            {(Object.keys(STATUS_CONFIG) as AppStatus[]).map((statusKey) => (
              <option key={statusKey} value={statusKey}>
                {STATUS_CONFIG[statusKey].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Adicionar ao stack"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onAddToStack(e.target.value);
              }
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="" disabled>
              Adicionar ao stack...
            </option>
            {stacks.map((stack) => (
              <option key={stack} value={stack}>
                {stack}
              </option>
            ))}
          </select>

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1">
              <span className="text-xs text-rose-300">Excluir {selectedCount}?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDeleteSelected();
                }}
                className="rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-rose-500"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-1.5 py-0.5 text-xs text-zinc-300 hover:text-white"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
