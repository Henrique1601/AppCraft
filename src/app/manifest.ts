import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AppCraft — Catálogo Pessoal de Apps",
    short_name: "AppCraft",
    description:
      "Organize todos os apps do seu PC por categorias, links oficiais, repositórios, comandos winget e notas pessoais.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
