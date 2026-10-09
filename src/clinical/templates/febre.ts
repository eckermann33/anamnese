import type { ComplaintTemplate, QuestionContext } from '../types';
import { associatedQ, evolutionQ, finalSection, imunoQ, labelsOf, opt } from './common';
import { formatNumber, joinPt } from '../../lib/format';

const reasonFrom = (items: Array<[boolean, string]>) =>
  `Aberto porque: ${joinPt(items.filter(([ok]) => ok).map(([, t]) => t))}.`;

const isDengueLike = (c: QuestionContext) =>
  c.sym('exantema') === 'sim' || c.sym('mialgia') === 'sim' || c.sym('dor_ocular') === 'sim' || c.has('epi', 'arbovirose');

const isProlonged = (c: QuestionContext) =>
  (c.complaintDays ?? 0) >= 14 || c.sym('sudorese_noturna') === 'sim' || c.sym('perda_peso') === 'sim';

export const febre: ComplaintTemplate = {
  id: 'febre',
  name: 'Febre',
  subject: 'Febre',
  description: 'Busca do foco, epidemiologia (dengue, malária, leptospirose, TB), imunossupressão e sinais de sepse.',
  keywords: ['febre', 'febril', 'calafrio', 'temperatura', 'quentura'],
  systems: ['respiratorio', 'geniturinario', 'digestorio', 'dermatologico', 'neurologico', 'hematologico'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Caracterização da febre',
      prose: 'list',
      questions: [
        {
          id: 'feb_tmax',
          label: 'Temperatura máxima aferida',
          type: 'number',
          unit: '°C',
          min: 34,
          max: 43,
          short: 'Temperatura máxima',
          narrative: (v) => `aferida, com máxima de ${formatNumber(Number(v))} °C`,
          why: {
            reason: 'Febre aferida tem mais valor que a referida. Temperaturas muito altas (≥ 41 °C) sugerem hipertermia/causa central; hipotermia na infecção é sinal de gravidade.',
            impact: 'Temperatura < 36 °C ou > 38 °C entra nos critérios de SIRS e na triagem de sepse.',
            refs: ['ssc-2026'],
          },
        },
        {
          id: 'feb_medida',
          label: 'Como foi medida?',
          type: 'single',
          showIf: (c) => c.num('feb_tmax') === undefined,
          options: [
            opt('termometro', 'Com termômetro', undefined, 'aferida com termômetro'),
            opt('referida', 'Só sensação (não aferida)', undefined, 'referida (não aferida)'),
          ],
          short: 'Aferição',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
        },
        {
          id: 'feb_padrao',
          label: 'Padrão da febre',
          type: 'single',
          options: [
            opt('continua', 'Contínua', undefined, 'de padrão contínuo'),
            opt('intermitente', 'Picos que normalizam', undefined, 'de padrão intermitente'),
            opt('remitente', 'Oscila sem normalizar', undefined, 'de padrão remitente'),
            opt('recorrente', 'Dias com e dias sem febre', undefined, 'de padrão recorrente'),
          ],
          short: 'Padrão',
          extra: true,
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason: 'O padrão raramente fecha o diagnóstico, mas febre recorrente em dias alternados sugere malária; intermitente com calafrios, bacteremia/abscesso.',
            impact: 'Ajuda a priorizar exames (gota espessa, hemoculturas).',
          },
        },
        {
          id: 'feb_antitermico',
          label: 'Resposta ao antitérmico',
          type: 'single',
          options: [
            opt('cede', 'Cede', undefined, 'que cede com antitérmico'),
            opt('parcial', 'Cede parcialmente', undefined, 'com resposta parcial ao antitérmico'),
            opt('nao_cede', 'Não cede', 'orange', 'que não cede com antitérmico'),
          ],
          short: 'Resposta ao antitérmico',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Procura do foco',
      questions: [
        associatedQ(
          [
            'calafrios',
            'sudorese_noturna',
            'perda_peso',
            'astenia',
            'mialgia',
            'artralgia',
            'cefaleia',
            'rigidez_nuca',
            'confusao',
            'dor_ocular',
            'dor_garganta',
            'otalgia',
            'coriza',
            'tosse',
            'expectoracao',
            'dispneia',
            'dor_pleuritica',
            'disuria',
            'polaciuria',
            'dor_lombar',
            'dor_abdominal',
            'diarreia',
            'vomitos',
            'exantema',
            'petequias',
            'lesao_pele',
            'linfonodomegalia',
            'ictericia',
          ],
          'Sintomas associados (procura do foco)',
        ),
      ],
    },
    {
      id: 'epidemiologia',
      title: 'Epidemiologia e hospedeiro',
      questions: [
        {
          id: 'epi',
          label: 'Epidemiologia',
          type: 'multi',
          options: [
            opt('viagem_malaria', 'Viagem para região amazônica/área de malária', 'orange', 'viagem recente para área endêmica de malária'),
            opt('enchente', 'Contato com enchente/lama/ratos', 'orange', 'contato com água de enchente/roedores'),
            opt('arbovirose', 'Casos de dengue/chikungunya por perto', undefined, 'casos de arboviroses na vizinhança'),
            opt('tb', 'Contato com tuberculose', undefined, 'contato com tuberculose'),
            opt('doentes', 'Contato com pessoas doentes', undefined, 'contato com sintomáticos'),
            opt('carrapato', 'Carrapato/área rural', undefined, 'exposição a carrapatos/área rural'),
            opt('ist', 'Relação sexual desprotegida', undefined, 'exposição sexual de risco'),
            opt('udi', 'Uso de drogas injetáveis', undefined, 'uso de drogas injetáveis'),
            opt('alimentos', 'Alimento/água suspeitos', undefined, 'ingestão de alimento/água suspeitos'),
          ],
          short: 'Epidemiologia',
          narrative: (v, _c, q) => `Epidemiologia: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'No Brasil, a epidemiologia define boa parte do diagnóstico da febre: arboviroses, malária (Amazônia), leptospirose (enchentes), febre maculosa (carrapato), TB.',
            impact: 'Cada exposição abre um exame específico: NS1/sorologia, gota espessa, sorologia para leptospirose, baciloscopia.',
            refs: ['ms-dengue-2024'],
          },
        },
        imunoQ(),
        {
          id: 'dispositivos',
          label: 'Cateter, sonda, prótese ou cirurgia recente?',
          type: 'yesno',
          yesText: 'Possui dispositivo invasivo/prótese ou cirurgia recente',
          noText: 'Sem dispositivos invasivos ou cirurgia recente',
          why: {
            reason: 'Dispositivos e procedimentos recentes são fontes frequentes de infecção relacionada à assistência.',
            impact: 'Examinar sítios de inserção e ferida operatória; culturas pareadas.',
          },
        },
      ],
    },
    {
      id: 'ramo_dengue',
      title: 'Ramo arboviroses (dengue)',
      showIf: isDengueLike,
      branch: {
        tone: 'orange',
        reason: (c) =>
          reasonFrom([
            [c.sym('exantema') === 'sim', 'exantema'],
            [c.sym('mialgia') === 'sim', 'mialgia'],
            [c.sym('dor_ocular') === 'sim', 'dor ocular/retro-orbitária'],
            [c.has('epi', 'arbovirose'), 'casos de arbovirose na vizinhança'],
          ]),
      },
      note: 'A fase crítica da dengue costuma ocorrer entre o 3º e o 7º dia, na defervescência. Sinais de alarme = grupo C (internação).',
      questions: [
        {
          id: 'den_dia',
          label: 'Dia de doença (desde o início da febre)',
          type: 'number',
          unit: 'dias',
          min: 0,
          max: 30,
          short: 'Dia de doença',
          narrative: (v) => `${v}º dia de doença`,
          computed: (c) => {
            const d = c.num('den_dia');
            if (d === undefined) return null;
            return d >= 3 && d <= 7
              ? { text: 'Período crítico (3º–7º dia): vigiar sinais de alarme', tone: 'orange' }
              : { text: 'Fora do período crítico típico', tone: 'accent' };
          },
        },
        {
          id: 'den_alarme',
          label: 'Sinais de alarme da dengue',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('dor_abd', 'Dor abdominal intensa e contínua', 'red', 'dor abdominal intensa e contínua'),
            opt('vomitos', 'Vômitos persistentes', 'red', 'vômitos persistentes'),
            opt('liquidos', 'Acúmulo de líquidos (ascite, derrames)', 'red', 'acúmulo de líquidos'),
            opt('hipotensao', 'Hipotensão postural/lipotimia', 'red', 'hipotensão postural/lipotimia'),
            opt('hepatomegalia', 'Hepatomegalia > 2 cm', 'red', 'hepatomegalia > 2 cm'),
            opt('sangramento', 'Sangramento de mucosa', 'red', 'sangramento de mucosa'),
            opt('letargia', 'Letargia/irritabilidade', 'red', 'letargia/irritabilidade'),
            opt('ht', 'Aumento progressivo do hematócrito', 'red', 'aumento progressivo do hematócrito'),
          ],
          short: 'Sinais de alarme da dengue',
          why: {
            reason: 'Os sinais de alarme indicam extravasamento plasmático e risco de choque. Definem o grupo C do manejo do Ministério da Saúde.',
            impact: 'Qualquer sinal de alarme → hidratação venosa e internação; choque → grupo D.',
            refs: ['ms-dengue-2024'],
          },
        },
      ],
    },
    {
      id: 'ramo_neutropenia',
      title: 'Ramo neutropenia febril',
      showIf: (c) => c.has('imuno', 'quimio'),
      branch: { tone: 'red', reason: () => 'Aberto porque: quimioterapia recente.' },
      note: 'Febre em paciente com quimioterapia recente = neutropenia febril até prova em contrário: hemograma, culturas e antibiótico de amplo espectro em até 1 hora.',
      questions: [
        {
          id: 'neu_ultima_qt',
          label: 'Data do último ciclo de quimioterapia',
          type: 'text',
          short: 'Último ciclo de QT',
          why: {
            reason: 'O nadir de neutrófilos costuma ocorrer 7–14 dias após o ciclo.',
            impact: 'Estima o risco de neutropenia profunda.',
            refs: ['idsa-neutropenia-2011'],
          },
        },
      ],
    },
    {
      id: 'ramo_prolongada',
      title: 'Ramo febre prolongada / tuberculose',
      showIf: isProlonged,
      branch: { tone: 'orange', reason: () => 'Aberto porque: febre prolongada, sudorese noturna ou perda de peso.' },
      questions: [
        {
          id: 'tb_tosse',
          label: 'Tosse há 3 semanas ou mais?',
          type: 'yesno',
          yesText: 'Tosse há ≥ 3 semanas (sintomático respiratório)',
          noText: 'Nega tosse prolongada',
        },
        {
          id: 'tb_previa',
          label: 'Já teve ou tratou tuberculose?',
          type: 'yesno',
          yesText: 'Tuberculose prévia',
          noText: 'Nega tuberculose prévia',
        },
      ],
    },
    {
      id: 'ramo_lepto',
      title: 'Ramo leptospirose',
      showIf: (c) => c.has('epi', 'enchente'),
      branch: { tone: 'orange', reason: () => 'Aberto porque: exposição a enchente/roedores.' },
      questions: [
        {
          id: 'lepto_sinais',
          label: 'Sinais sugestivos',
          type: 'multi',
          options: [
            opt('panturrilha', 'Dor intensa nas panturrilhas'),
            opt('sufusao', 'Olhos vermelhos sem secreção (sufusão)'),
            opt('ictericia', 'Icterícia rubínica'),
            opt('oliguria', 'Diminuição da urina'),
          ],
          short: 'Sinais de leptospirose',
          narrative: (v, _c, q) => `Sinais sugestivos de leptospirose: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Mialgia em panturrilhas e sufusão conjuntival após exposição a enchente sugerem leptospirose; icterícia + insuficiência renal + hemorragia = síndrome de Weil.',
            impact: 'Iniciar antibiótico precocemente na suspeita; função renal e plaquetas.',
          },
        },
      ],
    },
    {
      id: 'ramo_malaria',
      title: 'Ramo malária',
      showIf: (c) => c.has('epi', 'viagem_malaria'),
      branch: { tone: 'orange', reason: () => 'Aberto porque: viagem para área de malária.' },
      questions: [
        {
          id: 'malaria_viagem',
          label: 'Para onde e quando viajou?',
          type: 'text',
          short: 'Viagem',
          why: {
            reason: 'Febre até 30 dias após estar em área endêmica (sobretudo Amazônia Legal) exige pesquisa de malária.',
            impact: 'Gota espessa/teste rápido no mesmo dia; P. falciparum pode evoluir rapidamente para formas graves.',
          },
        },
      ],
    },
    {
      id: 'ramo_pediatrico',
      title: 'Sinais gerais de perigo (pediatria)',
      showIf: (c) => c.profile === 'pediatria',
      branch: { tone: 'red', reason: () => 'Aberto porque: perfil pediátrico.' },
      questions: [
        {
          id: 'aidpi_perigo',
          label: 'Sinais gerais de perigo (AIDPI)',
          type: 'tri',
          options: [
            opt('nao_bebe', 'Não consegue beber ou mamar', 'red', 'incapacidade de beber ou mamar'),
            opt('vomita_tudo', 'Vomita tudo o que ingere', 'red', 'vômitos de tudo o que ingere'),
            opt('convulsoes', 'Convulsões', 'red', 'convulsões'),
            opt('letargica', 'Letárgica ou inconsciente', 'red', 'letargia/inconsciência'),
          ],
          short: 'Sinais gerais de perigo',
          why: {
            reason: 'Na estratégia AIDPI, qualquer sinal geral de perigo classifica a criança como grave, independentemente da causa.',
            impact: 'Qualquer sinal presente → referência urgente/internação.',
          },
        },
      ],
    },
    finalSection(),
  ],
};
