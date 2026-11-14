# 🧠 AppCraft — Segundo Cérebro (Index)

> Catálogo pessoal de aplicativos do PC: organização por categorias, links oficiais, repositórios, comandos de instalação rápida (`winget` / `scoop` / `choco` / download), notas pessoais, status e importação automática via script Windows.

## Mapa de Conhecimento
- [[DECISIONS]] — Decisões arquiteturais (ADRs) e escolhas de stack.
- [[GOTCHAS]] — Armadilhas encontradas (ex: PowerShell `npm.ps1`, Next.js `AppCraft` uppercase, favicons).

## Arquitetura do Projeto
- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Persistência:** `localStorage` no cliente + Exportar / Importar JSON (`appcraft-catalog.json`)
- **Descoberta Windows:** Script auxiliar `scripts/scan-apps.ps1` (lê `winget` / Registro do Windows e gera JSON pronto para importar)
- **Visual:** Raycast / Linear dark mode, sidebar de categorias, busca rápida (`Ctrl+K` / `Cmd+K`), grid de cards com ícones automáticos (favicon / GitHub avatar) e modal de detalhes/edição.
