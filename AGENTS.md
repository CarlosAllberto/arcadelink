## Lista de tarefas

O backlog fica no Linear: workspace "Carlos Alberto", time `CAR`, projeto `ArcadeLink` (use `orca linear`, skill `orca-linear`). Toda issue deste repositório entra no projeto `ArcadeLink`, nunca solta no time, para não misturar com outros projetos. Tipo pela label (`Feature`, `Improvement`, `Bug`). Estados: Backlog = ideia, Todo = próximo, In Progress = agora, Done = feito.

O checklist da tarefa atual fica na descrição da própria issue, numa seção `## Etapas` com itens `- [ ]`. Atualize a descrição com `orca linear save-issue CAR-<n> --body-file -` (a descrição é substituída inteira: leia antes com `orca linear issue CAR-<n> --full --json` e preserve o resto).

Em tarefas com várias etapas:
- Antes de começar, crie ou ache a issue, escreva as etapas em `## Etapas` e passe a issue para In Progress.
- Marque cada item assim que terminar e acrescente o que descobrir no caminho.
- Se a conversa for resumida ou você perder o fio, releia a issue In Progress antes de continuar.
- Ao concluir, passe a issue para Done.
- Trabalho novo fora do escopo vira issue nova em Todo no projeto `ArcadeLink`, sem ser resolvido na hora.
- Nunca apague nem cancele issues sem eu pedir.
- Antes de dizer que terminou, rode build e testes e informe o resultado.

Tarefa de um passo só não precisa de checklist.

Ao terminar cada tarefa, organize o resumo em três títulos: Travado em mim, O que mudou, O que encontrei.

## Comandos

- Instalar: `npm install`
- Rodar: `npm run dev`
- Testar: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

Ao trocar um PNG em `public/cartridges`, apague `.next` antes de testar: o otimizador de imagens mantém a versão antiga em cache.

## Convenções

- Interface em português do Brasil, sem travessões. "ArcadeLink" para pessoas, `arcadelink` em identificadores.
- Consoles e áreas de capa ficam só em `src/config/consoles.ts`.
- Toda página nova chama `requireUser()` no servidor: sem sessão, vai para `/login`.
- CSS puro com variáveis em `src/styles/theme.css`, sem Tailwind.
- Migrações ficam em `supabase/migrations/`. Toda tabela nova precisa de RLS e `grant` explícito.
- EmulatorJS fixado na 4.2.3 pelo CDN. Opções, shaders e botões em `src/lib/emulator/options.ts` vêm dessa versão: confira no código-fonte ao atualizar.
- Exportações pelo MCP do Figma saem achatadas sobre o fundo da página. Para transparência real, exporte sobre dois fundos e recupere o alfa pela diferença.
