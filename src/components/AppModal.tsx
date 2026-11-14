"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Trash2,
  X,
} from "lucide-react";
import { AppItem, AppStatus, STATUS_CONFIG } from "@/types/app";
import { AppIcon } from "./AppIcon";

interface AppModalProps {
  app: AppItem | null; // null = creating new app
  categories: string[];
  onClose: () => void;
  onSave: (data: Omit<AppItem, "id" | "createdAt" | "updatedAt">, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

export function AppModal({
  app,
  categories,
  onClose,
  onSave,
  onDelete,
}: AppModalProps) {
  const [name, setName] = useState(app?.name ?? "");
  const [category, setCategory] = useState(app?.category ?? categories[0] ?? "Utilitários");
  const [status, setStatus] = useState<AppStatus>(app?.status ?? "installed");
  const [websiteUrl, setWebsiteUrl] = useState(app?.websiteUrl ?? "");
  const [repoUrl, setRepoUrl] = useState(app?.repoUrl ?? "");
  const [downloadUrl, setDownloadUrl] = useState(app?.downloadUrl ?? "");
  const [installCommand, setInstallCommand] = useState(app?.installCommand ?? "");
  const [version, setVersion] = useState(app?.version ?? "");
  const [iconUrl, setIconUrl] = useState(app?.iconUrl ?? "");
  const [description, setDescription] = useState(app?.description ?? "");
  const [notes, setNotes] = useState(app?.notes ?? "");
  const [tagsText, setTagsText] = useState(app?.tags.join(", ") ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave(
      {
        name: name.trim(),
        category: category.trim() || "Utilitários",
        status,
        websiteUrl: websiteUrl.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
        downloadUrl: downloadUrl.trim() || undefined,
        installCommand: installCommand.trim() || undefined,
        version: version.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: Array.from(new Set(tags)),
      },
      app?.id
    );
  };

  const handleCopy = async () => {
    if (!installCommand.trim()) return;
    await navigator.clipboard.writeText(installCommand.trim());
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon
              name={name || "Novo App"}
              iconUrl={iconUrl}
              websiteUrl={websiteUrl}
              repoUrl={repoUrl}
              size="md"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-100">
                {app ? app.name : "Adicionar Novo App"}
              </h2>
              <p className="text-xs text-zinc-500">
                {app ? "Edite links, notas ou comando de instalação" : "Cadastre um app no seu catálogo pessoal"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Nome do App *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Raycast, VS Code, Obsidian"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppStatus)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  {(Object.keys(STATUS_CONFIG) as AppStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {STATUS_CONFIG[key].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Site Oficial</span>
                {websiteUrl && (
                  <a
                    href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                  >
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3 text-zinc-400" />
                  Repositório (GitHub / GitLab)
                </span>
                {repoUrl && (
                  <a
                    href={repoUrl.startsWith("http") ? repoUrl : `https://${repoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                  >
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/usuario/repo"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Comando de Instalação (winget / scoop / choco)</span>
                {installCommand && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copiar
                      </>
                    )}
                  </button>
                )}
              </label>
              <input
                type="text"
                value={installCommand}
                onChange={(e) => setInstallCommand(e.target.value)}
                placeholder="winget install ..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="inline-flex items-center gap-1">
                  <Download className="h-3 w-3 text-zinc-400" />
                  URL Direta de Download / Release
                </span>
              </label>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://.../releases/latest"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Descrição curta
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve este aplicativo..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Anotações pessoais (atalhos, config, licença, motivo de uso)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Atalho Alt+Space; backup de config em ~/dotfiles..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="open-source, cli, windows"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Versão (opcional)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              URL do Ícone customizado (opcional — automático pelo site/GitHub)
            </label>
            <input
              type="text"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="Deixe vazio para detectar automaticamente pelo site ou GitHub"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
            {app && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">Confirmar exclusão?</span>
                  <button
                    type="button"
                    onClick={() => onDelete(app.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
                  >
                    Sim, excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
              >
                {app ? "Salvar alterações" : "Adicionar App"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
