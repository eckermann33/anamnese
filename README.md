# Anamnese

PWA (site instalável, funciona offline) de apoio à **anamnese, exame físico, raciocínio diagnóstico e evolução clínica**, feito para estudantes de medicina e médicos no Brasil, para uso no celular à beira do leito.

> Ferramenta de apoio ao raciocínio clínico e ao ensino. Não substitui o julgamento médico.

## Status

🚧 **Fase 1 em construção.** Já prontos:

- Design system “Liquid Glass” (tokens, vidro, componentes iOS: tab bar flutuante, sheets, chips, segmented, toggles, listas agrupadas).
- Base clínica offline: 8 templates de queixa com anamnese ramificada, catálogo de sintomas (HDA ↔ ISDA), red flags em tempo real com conduta inicial, alertas de alergia/interações (nomes comerciais brasileiros, Beers, gestação), 15 escores calculados localmente, gerador do texto do prontuário (ID, QP, HDA, ISDA, AP, AF, HV, CSE, EF, HD, Conduta).
- Referências curadas em ABNT, conferidas no PubMed.
- Função de IA no servidor (`/api/ai`) no **mesmo esquema do invictus.med**: provedores compatíveis com a API da OpenAI (Groq `openai/gpt-oss-120b` + reserva `qwen/qwen3-32b`), cascata automática, resposta em JSON validada. A chave nunca vai para o navegador.

Em andamento: telas do fluxo do atendimento, Ajustes/backup e guia de publicação.

## Rodar os testes

```bash
npm install
npm test
```

## Estrutura

```
src/clinical/   conhecimento clínico (templates, sintomas, exame, red flags, escores, medicações, texto do prontuário)
src/components/ design system (ui/) e componentes clínicos (clinical/)
src/db/         banco local (IndexedDB) — dados só no aparelho
server/         função de IA (regras e prompts) — roda no servidor
shared/         contratos da IA e referências (usados pelo app e pelo servidor)
api/ai.ts       adaptador Vercel     ·     worker/index.ts   adaptador Cloudflare Workers
tests/          testes automatizados
```
