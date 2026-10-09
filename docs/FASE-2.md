# Fase 2 — evolução e acompanhamento

Prontuário contínuo para enfermaria/UTI: a anamnese da Fase 1 vira a base, e cada dia ganha uma evolução SOAP.

---

## O que ficou pronto

**Na tela do paciente** (aba Pacientes → toque no paciente):

- **Internação**: data de internação (conta D1, D2…) e leito.
- **Evolução diária**: “Evoluir a partir de ontem” ou “Nova evolução em branco”, e a lista das evoluções anteriores.
- **Sinais vitais**: minigráficos de tendência (PAS, FC, FR, Tax, SpO₂, HGT) da admissão até hoje, com cor pelo último valor.
- **Lista de problemas**: ativos/resolvidos (toque no círculo para resolver). Dá para importar as hipóteses da anamnese.
- **Dispositivos**: tipo, local, data de inserção e de retirada, com contagem de dias (D1 = dia da inserção).
- **Antimicrobianos**: D1 = dia da 1ª dose, com o tempo previsto (ex.: D5/7). Fica laranja quando chega ao tempo previsto.
- **Exames**: cole o texto do sistema do hospital → tabela por data com setas (↑ ↓) comparando com o resultado anterior do mesmo exame.
- **Passagem de plantão (SBAR)**: montada na hora com os registros (funciona offline) e, se quiser, revisada pela IA.

**No editor da evolução** (SOAP):

- **S**: chips rápidos (“aceitando dieta”, “diurese presente”…) + texto livre.
- **O**: sinais vitais com os de ontem como referência, peso do dia, **balanço hídrico** (entradas/saídas, 24/12/6 h) com **débito urinário em mL/kg/h** e alerta de oligúria (< 0,5 mL/kg/h, critério do KDIGO), exame físico (copiar da anamnese ou modelo normal para editar), dispositivos, antimicrobianos e exames.
- **A**: impressão do dia + lista de problemas.
- **P**: plano, **pendências** (checklist do dia) e **checklist do leito FAST HUGS BID** (aberto por padrão em UTI).
- **Texto da evolução** pronto para **copiar** ou **exportar em PDF**.
- **Evoluir a partir de ontem**: copia os textos e as pendências abertas, e destaca em **laranja** o que veio de ontem até você editar ou tocar em “Revisado”. Sinais vitais e balanço **nunca** são copiados.

**Exames sem IA (offline)**: o app entende o formato “sigla valor” — `Hb 10,2 Ht 31 Leuco 12.300 Plaq 210 mil Cr 1,4 Na 138 K 4,2 pH 7,32 BE -4`. Vírgula ou ponto decimal, milhar com ponto, “mil”, marcações ↑ ↓ (H) (L) do laudo. Com internet, “Organizar com IA” entende laudos bagunçados.

**Privacidade**: para a IA (exames e SBAR) vai só o texto clínico, **sem iniciais e sem leito**. Ao copiar o SBAR, a identificação é colocada no próprio aparelho.

---

## Passo a passo para atualizar o que você já tem rodando

Se você seguiu o [guia da Fase 1](FASE-1.md), é só isto:

1. Abra o Terminal na pasta do projeto:

   ```bash
   cd ~/Documents/anamnese
   ```

2. Baixe a versão nova e instale o que mudou:

   ```bash
   git pull
   npm install
   ```

3. Teste no seu computador:

   ```bash
   npm test          # agora são 44 testes (inclui os da evolução)
   npm run dev       # abre em http://localhost:5173
   ```

4. Publique de novo:

   - **Cloudflare**: `npm run deploy` (os segredos `LLM_KEY` etc. continuam lá).
   - **Vercel**: nada a fazer — cada `git push` publica sozinho.

5. No celular, abra o app instalado: vai aparecer **“Nova versão disponível”** → **Atualizar**. Seus pacientes continuam salvos (o banco não muda de formato nesta fase).

## Como testar rapidinho

1. Atenda um paciente (aba **Atender**) com cenário **Enfermaria** e conclua o atendimento.
2. Na tela do paciente, ajuste a **data de internação** para alguns dias atrás.
3. Adicione um **dispositivo**, um **antimicrobiano** e cole uns **exames**.
4. Toque em **Nova evolução em branco**, preencha e mude a **data** para ontem.
5. Volte ao paciente e toque em **Evoluir a partir de…**: os campos copiados aparecem em laranja.
6. Toque no ícone de aperto de mão (barra de baixo) para a **passagem de plantão**.

## Referências usadas nesta fase

- KELLUM, J. A.; LAMEIRE, N.; KDIGO AKI GUIDELINE WORK GROUP. Diagnosis, evaluation, and management of acute kidney injury: a KDIGO summary (Part 1). **Critical Care**, v. 17, n. 1, p. 204, 2013. DOI: https://doi.org/10.1186/cc11454.
- MÜLLER, M. et al. Impact of the communication and patient hand-off tool SBAR on patient safety: a systematic review. **BMJ Open**, v. 8, n. 8, e022202, 2018. DOI: https://doi.org/10.1136/bmjopen-2018-022202.
- VINCENT, J. L. Give your patient a fast hug (at least) once a day. **Critical Care Medicine**, v. 33, n. 6, p. 1225-1229, 2005. DOI: https://doi.org/10.1097/01.ccm.0000165962.16682.46.
- VINCENT, W. R.; HATTON, K. W. Critically ill patients need "FAST HUGS BID" (an updated mnemonic). **Critical Care Medicine**, v. 37, n. 7, p. 2326-2327, 2009. DOI: https://doi.org/10.1097/CCM.0b013e3181aabc29.
