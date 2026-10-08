# Fase 3 — Treino OSCE, ditado por voz, templates e busca

---

## O que ficou pronto

### Treino OSCE (aba **Treino**)

- **Estação com paciente simulado pela IA.** Você conversa por texto ou **por voz** (botão de microfone) e o paciente responde em linguagem leiga. Ele só revela o que você pergunta.
- **Examinar:** troque para **Examinar** e peça manobras (ex.: “sinal de Murphy”, “ausculta pulmonar”) ou use os atalhos. O examinador descreve o achado.
- **Biblioteca de 4 estações curadas** (dor torácica/SCA, PAC, apendicite e HSA) ou **caso gerado pela IA**, por sistema e dificuldade (fácil, médio, difícil).
- **Cronômetro** opcional (8, 10 ou 15 min) e **voz do paciente** (o celular lê a resposta em voz alta).
- **Feedback por domínio** (HDA, ISDA, antecedentes, exame físico e raciocínio, de 0 a 10), pontos fortes, perguntas que faltaram, red flags não investigadas, diagnóstico esperado comentado e dicas. No fim dá para abrir o **roteiro completo** do caso.
- O **histórico** das estações fica salvo. Com conta, também sincroniza.

### Ditado por voz (no atendimento)

- Toque no **microfone** da barra de cima e dite o caso de uma vez. Dá também para colar ou digitar o texto.
- **Distribuir nos campos (IA):** a IA põe cada informação no campo certo (HDA, sintomas, sinais vitais, medicações, alergias, hábitos, exame).
- **Você revisa item por item** antes de aplicar, com o trecho do ditado que justifica cada valor. O que não coube em nenhum campo pode ir para “Outras informações da história”.
- **Segurança:** valores fora das opções, números impossíveis e campos inexistentes são descartados automaticamente.
- **Sem voz no navegador?** Use o microfone do teclado (no iPhone, o 🎤 ao lado da barra de espaço). Funciona em qualquer campo do app.

### Templates novos (agora são 14)

Tosse, diarreia, palpitações, tontura/vertigem, edema, disúria/sintomas urinários e déficit neurológico agudo. Cada um vem com ramos, “por que perguntar?” com referência e red flags próprias:

- **Tontura:** sinais centrais → possível AVC de fossa posterior; síndrome vestibular aguda → lembrar do HINTS.
- **Tosse:** ≥ 3 semanas → investigar tuberculose (sintomático respiratório); hemoptise volumosa.
- **Palpitações:** síncope, palpitação ao esforço, cardiopatia ou morte súbita na família → alto risco.
- **Disúria:** febre/dor lombar/gestação → pielonefrite ou ITU complicada.
- **Diarreia:** desidratação grave, disenteria, *C. difficile*.
- **Edema:** angioedema (via aérea), TVP.
- **Déficit neurológico:** pede a **hora da última vez visto bem** (janela de trombólise).

### Busca rápida (no atendimento)

No botão de **etapas** (☰), digite o que procura (ex.: “tabagismo”, “vacina”, “irradiação”). Toque no resultado para ir direto à pergunta, que pisca em azul.

---

## Passo a passo para atualizar

Igual às outras fases:

```bash
cd ~/Documents/anamnese
git pull
npm install
npm test          # 69 testes
npm run dev       # http://localhost:5173
npm run deploy    # publica na Cloudflare (na Vercel é automático no push)
```

No celular, toque em **Atualizar** quando aparecer “Nova versão disponível”.

### Microfone

- **iPhone (Safari):** na primeira vez, o Safari pergunta se pode usar o microfone. Toque em **Permitir**. Se negou sem querer, abra os **Ajustes** do iPhone, procure **Safari → Microfone** e escolha **Perguntar** ou **Permitir**.
- **Chrome/Android:** o reconhecimento de voz do Chrome usa a internet.
- O microfone só funciona em **https** (site publicado) ou em `localhost`.

---

## Referências novas (ABNT)

- GUPTA, K. et al. International clinical practice guidelines for the treatment of acute uncomplicated cystitis and pyelonephritis in women: a 2010 update by the Infectious Diseases Society of America and the European Society for Microbiology and Infectious Diseases. **Clinical Infectious Diseases**, v. 52, n. 5, p. e103-e120, 2011. DOI: https://doi.org/10.1093/cid/ciq257.
- IRWIN, R. S. et al. Classification of cough as a symptom in adults and management algorithms: CHEST guideline and expert panel report. **Chest**, v. 153, n. 1, p. 196-209, 2018. DOI: https://doi.org/10.1016/j.chest.2017.10.016.
- KATTAH, J. C. et al. HINTS to diagnose stroke in the acute vestibular syndrome: three-step bedside oculomotor examination more sensitive than early MRI diffusion-weighted imaging. **Stroke**, v. 40, n. 11, p. 3504-3510, 2009. DOI: https://doi.org/10.1161/STROKEAHA.109.551234.
- RAVIELE, A. et al. Management of patients with palpitations: a position paper from the European Heart Rhythm Association. **Europace**, v. 13, n. 7, p. 920-934, 2011. DOI: https://doi.org/10.1093/europace/eur130.
- SHANE, A. L. et al. 2017 Infectious Diseases Society of America clinical practice guidelines for the diagnosis and management of infectious diarrhea. **Clinical Infectious Diseases**, v. 65, n. 12, p. e45-e80, 2017. DOI: https://doi.org/10.1093/cid/cix669.
- BRASIL. Ministério da Saúde. Secretaria de Vigilância em Saúde. **Manual de recomendações para o controle da tuberculose no Brasil**. 2. ed. atual. Brasília: Ministério da Saúde, 2019.
