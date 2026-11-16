"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, TerminalSquare, Upload, X } from "lucide-react";

interface ScanGuideModalProps {
  open: boolean;
  onClose: () => void;
  onImportClick: () => void;
}

const PS_COMMAND =
  "powershell -ExecutionPolicy Bypass -File .\\scripts\\scan-apps.ps1";

const PS_FOLDER_COMMAND =
  'powershell -ExecutionPolicy Bypass -File .\\scripts\\scan-apps.ps1 -ScanFolder "D:\\Instaladores"';

export function ScanGuideModal({
  open,
  onClose,
  onImportClick,
}: ScanGuideModalProps) {
  const [copied, setCopied] = useState<"standard" | "folder" | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async (cmd: string, kind: "standard" | "folder") => {
    await navigator.clipboard.writeText(cmd);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Escanear Apps Instalados no Windows
              </h2>
              <p className="text-xs text-zinc-500">
                Gere seu catálogo inicial automaticamente em segundos
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

        <div className="p-5 space-y-4 text-xs leading-relaxed text-zinc-300">
          <p className="text-zinc-400">
            O script <code className="text-zinc-200">scripts/scan-apps.ps1</code> lê os
            programas instalados no seu Windows, filtra componentes de sistema, infere
            categorias e salva um arquivo{" "}
            <code className="text-zinc-200">appcraft-scan.json</code> pronto para
            importar aqui.
          </p>

          <div className="space-y-2">
            <p className="font-medium text-zinc-200">
              1. Execute no PowerShell (na pasta do projeto):
            </p>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-[11px] text-zinc-200">
              <span className="truncate">{PS_COMMAND}</span>
              <button
                type="button"
                onClick={() => handleCopy(PS_COMMAND, "standard")}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                {copied === "standard" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copiar
                  </>
                )}
              </button>
            </div>

            <p className="pt-1 text-[11px] text-zinc-400">
              Ou escaneie uma pasta/HD com instaladores (.exe, .msi, .zip, .7z):
            </p>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-[11px] text-zinc-200">
              <span className="truncate">{PS_FOLDER_COMMAND}</span>
              <button
                type="button"
                onClick={() => handleCopy(PS_FOLDER_COMMAND, "folder")}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                {copied === "folder" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-zinc-200">
              2. Importe o arquivo gerado:
            </p>
            <p className="text-zinc-400">
              Clique abaixo para selecionar o{" "}
              <code className="text-zinc-200">appcraft-scan.json</code>. Apps novos
              serão mesclados sem duplicar os que você já editou.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
            <a
              href="/scan-apps.ps1"
              download="scan-apps.ps1"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar scan-apps.ps1
            </a>

            <button
              type="button"
              onClick={() => {
                onClose();
                onImportClick();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar appcraft-scan.json
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
