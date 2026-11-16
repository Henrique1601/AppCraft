"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { AppItem } from "@/types/app";
import { hashSyncKey, RECOMMENDED_SYNC_KEY_LENGTH } from "@/lib/sync-client";

interface CloudSyncModalProps {
  open: boolean;
  onClose: () => void;
  apps: AppItem[];
  categories: string[];
  onApplyCloudData: (apps: AppItem[], categories: string[]) => void;
  onNotify: (msg: string) => void;
  onAutoSyncChange?: (enabled: boolean) => void;
}

const SYNC_KEY_STORAGE = "appcraft:sync-key";
const LAST_SYNC_STORAGE = "appcraft:last-sync";
const AUTO_SYNC_STORAGE = "appcraft:auto-sync";

function generateSyncKey(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const segment = (len: number) => {
    let out = "";
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(len);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < len; i += 1) {
        out += alphabet[bytes[i] % alphabet.length];
      }
      return out;
    }
    for (let i = 0; i < len; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  };
  return `appcraft-${segment(4)}-${segment(4)}`;
}

function formatSyncDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function CloudSyncModal({
  open,
  onClose,
  apps,
  categories,
  onApplyCloudData,
  onNotify,
  onAutoSyncChange,
}: CloudSyncModalProps) {
  const [syncKey, setSyncKey] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"push" | "pull" | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      try {
        const savedKey = localStorage.getItem(SYNC_KEY_STORAGE) ?? "";
        const savedSyncAt = localStorage.getItem(LAST_SYNC_STORAGE);
        const savedAutoSync = localStorage.getItem(AUTO_SYNC_STORAGE) === "true";
        setSyncKey(savedKey);
        setLastSyncAt(savedSyncAt);
        setAutoSync(savedAutoSync && savedKey.trim().length >= 4);
      } catch {
        // Ignore storage access errors
      }
      setErrorMsg(null);
      setStatusMsg(null);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingAction) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loadingAction, onClose]);

  if (!open) return null;

  const persistSyncKey = (key: string) => {
    try {
      localStorage.setItem(SYNC_KEY_STORAGE, key);
    } catch {
      // Ignore storage errors
    }
  };

  const persistLastSync = (iso: string) => {
    setLastSyncAt(iso);
    try {
      localStorage.setItem(LAST_SYNC_STORAGE, iso);
    } catch {
      // Ignore storage errors
    }
  };

  const validateKey = (): string | null => {
    const trimmed = syncKey.trim();
    if (trimmed.length < RECOMMENDED_SYNC_KEY_LENGTH) {
      setErrorMsg(
        `Informe uma Sync Key com pelo menos ${RECOMMENDED_SYNC_KEY_LENGTH} caracteres para proteger seu catálogo.`
      );
      return null;
    }
    return trimmed;
  };

  const handleGenerateKey = () => {
    const generated = generateSyncKey();
    setSyncKey(generated);
    persistSyncKey(generated);
    setErrorMsg(null);
    setStatusMsg("Nova Sync Key gerada. Guarde-a para acessar em outros PCs.");
  };

  const handleCopyKey = async () => {
    const trimmed = syncKey.trim();
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setErrorMsg("Não foi possível copiar para a área de transferência.");
    }
  };

  const handlePush = async () => {
    const trimmed = validateKey();
    if (!trimmed) return;

    persistSyncKey(trimmed);
    setLoadingAction("push");
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const hashedKey = await hashSyncKey(trimmed);
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncKey: hashedKey,
          payload: {
            version: 1,
            syncedAt: new Date().toISOString(),
            categories,
            apps,
          },
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        updatedAt?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erro ao enviar catálogo para a nuvem.");
      }

      const timestamp = data.updatedAt || new Date().toISOString();
      persistLastSync(timestamp);
      const msg = `Catálogo enviado para a nuvem (${apps.length} apps).`;
      setStatusMsg(msg);
      onNotify(msg);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao enviar para a nuvem.";
      setErrorMsg(message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePull = async () => {
    const trimmed = validateKey();
    if (!trimmed) return;

    persistSyncKey(trimmed);
    setLoadingAction("pull");
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const hashedKey = await hashSyncKey(trimmed);
      const response = await fetch(
        `/api/sync?key=${encodeURIComponent(hashedKey)}`,
        { cache: "no-store" }
      );

      const data = (await response.json()) as {
        found?: boolean;
        payload?: { apps?: unknown; categories?: unknown };
        updatedAt?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar catálogo na nuvem.");
      }

      if (!data.found || !data.payload) {
        setErrorMsg("Nenhum catálogo encontrado para esta Sync Key.");
        return;
      }

      const cloudApps = Array.isArray(data.payload.apps)
        ? (data.payload.apps as AppItem[])
        : null;

      if (!cloudApps) {
        throw new Error("Formato de catálogo inválido recebido da nuvem.");
      }

      const cloudCategories =
        Array.isArray(data.payload.categories) &&
        data.payload.categories.length > 0
          ? data.payload.categories.map((c) => String(c))
          : categories;

      onApplyCloudData(cloudApps, cloudCategories);

      const timestamp = data.updatedAt || new Date().toISOString();
      persistLastSync(timestamp);

      const msg = `Catálogo baixado da nuvem (${cloudApps.length} apps).`;
      setStatusMsg(msg);
      onNotify(msg);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao baixar da nuvem.";
      setErrorMsg(message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleAutoSync = () => {
    if (!autoSync && syncKey.trim().length < 4) {
      setErrorMsg("Defina uma Sync Key (mínimo 4 caracteres) para ativar o Auto-Sync.");
      return;
    }

    const next = !autoSync;
    setAutoSync(next);
    try {
      localStorage.setItem(AUTO_SYNC_STORAGE, next ? "true" : "false");
    } catch {
      // Ignore storage errors
    }
    setErrorMsg(null);
    onAutoSyncChange?.(next);
    onNotify(next ? "Auto-Sync ativado." : "Auto-Sync desativado.");
  };

  const isBusy = loadingAction !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Sincronização na Nuvem
              </h2>
              <p className="text-xs text-zinc-500">
                Salve e restaure seu catálogo entre dispositivos
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs text-zinc-300">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5">
            <span className="text-zinc-400">Catálogo local atual</span>
            <span className="font-medium text-zinc-200">
              {apps.length} {apps.length === 1 ? "app" : "apps"} ·{" "}
              {categories.length}{" "}
              {categories.length === 1 ? "categoria" : "categorias"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="appcraft-sync-key"
                className="inline-flex items-center gap-1.5 font-medium text-zinc-200"
              >
                <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                Sync Key
              </label>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleGenerateKey}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                Gerar chave
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="appcraft-sync-key"
                type="text"
                value={syncKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setSyncKey(val);
                  persistSyncKey(val.trim());
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ex: appcraft-a7k9-m2x4"
                disabled={isBusy}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleCopyKey}
                disabled={!syncKey.trim() || isBusy}
                title="Copiar Sync Key"
                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Use a mesma Sync Key em outro navegador ou computador para
              sincronizar seus dados. Mínimo de 4 caracteres.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5">
            <div>
              <p className="font-medium text-zinc-200">Auto-Sync</p>
              <p className="text-[11px] text-zinc-500">
                Enviar alterações automaticamente para a nuvem
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSync}
              disabled={isBusy || (!autoSync && syncKey.trim().length < 4)}
              onClick={handleToggleAutoSync}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                autoSync
                  ? "border-indigo-500/60 bg-indigo-600"
                  : "border-zinc-700 bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  autoSync ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {lastSyncAt && (
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Última sincronização</span>
              <span className="font-mono text-zinc-400">
                {formatSyncDate(lastSyncAt)}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && !errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 border-t border-zinc-800/80 pt-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handlePush}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction === "push" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5" />
              )}
              Enviar para Nuvem (Push)
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handlePull}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction === "pull" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudDownload className="h-3.5 w-3.5" />
              )}
              Baixar da Nuvem (Pull)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CloudSyncModal;
