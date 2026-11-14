export type AppStatus = "installed" | "favorite" | "wishlist" | "archived";

export interface AppItem {
  id: string;
  name: string;
  category: string;
  status: AppStatus;
  websiteUrl?: string;
  repoUrl?: string;
  downloadUrl?: string;
  installCommand?: string;
  description?: string;
  notes?: string;
  tags: string[];
  stacks?: string[];
  version?: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  color: string; // Tailwind color key or hex
}

export interface AppCatalogExport {
  version: 1;
  exportedAt: string;
  categories: string[];
  apps: AppItem[];
}

export const DEFAULT_CATEGORIES: string[] = [
  "Dev & Terminal",
  "Produtividade",
  "Design & Mídia",
  "Utilitários",
  "IA & Dados",
  "Segurança & Rede",
  "Navegadores",
  "Jogos & Entretenimento",
];

export const DEFAULT_STACKS: string[] = [
  "Pós-Formatação",
  "Dev Stack",
  "Mídia & Design",
];

export const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  installed: {
    label: "Instalado",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  favorite: {
    label: "Favorito",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  wishlist: {
    label: "Testar depois",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-400",
  },
  archived: {
    label: "Arquivado",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-500",
  },
};
