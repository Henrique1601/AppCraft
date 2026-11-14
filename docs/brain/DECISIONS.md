# 🏛️ Decisões Arquiteturais (ADRs)

## ADR-001: Persistência Client-Side (`localStorage` + JSON Export/Import)
- **Contexto:** O usuário quer organizar os apps do próprio PC de forma rápida, sem depender de setup de banco de dados externo ou login, mas podendo fazer backup e versionar.
- **Decisão:** Armazenar o catálogo no `localStorage` com seed inicial curado e suporte nativo a **Exportar JSON** e **Importar JSON** (incluindo merge inteligente sem duplicar apps).
- **Consequência:** Zero infraestrutura necessária; deploy instantâneo na Vercel ou execução local.

## ADR-002: Script Auxiliar de Varredura Windows (`scripts/scan-apps.ps1`)
- **Contexto:** Cadastrar dezenas de apps manualmente do zero é trabalhoso.
- **Decisão:** Criar um script PowerShell (`scripts/scan-apps.ps1`) que consulta `winget list` e o Registro do Windows (`Uninstall`), normaliza nomes, tenta inferir categorias e `wingetId`, e gera `apps-export.json` pronto para ser importado na UI.
- **Consequência:** Onboarding em segundos mantendo o app web 100% seguro no browser.

## ADR-003: Estética Raycast / Linear + Busca `Ctrl+K`
- **Contexto:** O usuário escolheu visual Raycast/Linear em dark mode com sidebar de categorias e busca rápida.
- **Decisão:** UI em dark mode (`#09090b` / `#111114`), bordas sutis `1px`, Command Palette (`Ctrl+K` / `Cmd+K`), sidebar colapsável com contadores por categoria e status, e cards com favicon automático + fallback elegante.

## ADR-004: Princípio Ponytail (Simplicidade e Zero Overengineering)
- **Decisão:** Usar `lucide-react` apenas para ícones essenciais, zero bibliotecas pesadas de estado (React hooks nativos + `useMemo`), e schema único tipado em TypeScript (`src/types/app.ts`) com validação limpa na importação JSON.
