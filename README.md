# Anamnese

PWA (site instalável, funciona offline) de apoio à **anamnese, exame físico, raciocínio diagnóstico e evolução clínica**, feito para estudantes de medicina e médicos no Brasil, para uso no celular à beira do leito.

> Ferramenta de apoio ao raciocínio clínico e ao ensino. Não substitui o julgamento médico.

## Status

| Fase | Conteúdo | Situação |
| --- | --- | --- |
| 1 | Design system “Liquid Glass”, atendimento completo (anamnese ramificada, exame físico, hipóteses com IA, texto do prontuário), red flags, alertas de medicação, escores, IA no servidor | ✅ pronta — [como rodar e publicar](docs/FASE-1.md) |
| 2 | Evolução diária (SOAP) com “evoluir a partir de ontem”, tendência dos sinais vitais, balanço hídrico e mL/kg/h, dispositivos e antimicrobianos com contagem de dias, exames colados com comparação, lista de problemas, pendências, checklist FAST HUGS BID, passagem de plantão SBAR | ✅ pronta — [o que mudou e como atualizar](docs/FASE-2.md) |
| + | Contas (Firebase, mesma conta do DPOC Clínico) com sincronização entre celular e computador; IA protegida pelo login | ✅ — [como ligar](docs/CONTAS.md) |
| 3 | Treino OSCE com paciente simulado (texto/voz, manobras, feedback por domínio), ditado por voz distribuído nos campos, 14 templates por queixa, busca rápida | ✅ pronta — [o que mudou](docs/FASE-3.md) |

A IA segue o **mesmo esquema do invictus.med**: provedores compatíveis com a API da OpenAI (Groq `openai/gpt-oss-120b` + reserva `qwen/qwen3-32b`), cascata automática e resposta em JSON validada. A chave fica só no servidor (Cloudflare Workers ou Vercel), nunca no navegador.

## Começo rápido

```bash
npm install
cp .env.example .env.local   # preencha LLM_KEY (pode ser a chave Groq do invictus.med)
npm run dev                  # http://localhost:5173
```

**Falta publicar?** Veja [docs/PROXIMOS-PASSOS.md](docs/PROXIMOS-PASSOS.md) (15 min, só pelo navegador).

Passo a passo completo (instalar o Node no Mac, publicar na Cloudflare/Vercel, instalar no iPhone): **[docs/FASE-1.md](docs/FASE-1.md)**.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (com `/api/ai` local) |
| `npm test` | testes automáticos |
| `npm run typecheck` | checagem do TypeScript |
| `npm run check:contrast` | confere o contraste das cores (WCAG AA) |
| `npm run build` / `npm run preview` | gera e roda a versão final |
| `npm run deploy` | publica na Cloudflare Workers |

## Estrutura

```
src/clinical/   conhecimento clínico (14 templates, sintomas, exame, red flags, escores, medicações, exames, evolução, texto)
src/components/ design system (ui/) e componentes clínicos (clinical/)
src/db/         banco local (IndexedDB) — um por conta; sem conta, só no aparelho
src/cloud/      contas e sincronização (Firebase Auth + Firestore)
server/         função de IA (regras e prompts) — roda no servidor
shared/         contratos da IA e referências (usados pelo app e pelo servidor)
api/ai.ts       adaptador Vercel     ·     worker/index.ts   adaptador Cloudflare Workers
tests/          testes automatizados
docs/           guias de cada fase (rodar localmente e publicar)
```
