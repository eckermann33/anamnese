import type { ComplaintTemplate } from '../types';
import { ANTITHROMBOTIC_OPTIONS, associatedQ, finalSection, labelsOf, opt } from './common';
import { joinPt } from '../../lib/format';

export const deficitNeurologico: ComplaintTemplate = {
  id: 'deficit_neurologico',
  name: 'Déficit neurológico agudo',
  subject: 'Déficit neurológico',
  description: 'Hora do início (última vez visto bem), sinais focais, AIT × AVC, imitadores (hipoglicemia, crise, enxaqueca) e informações para trombólise.',
  keywords: ['fraqueza de um lado', 'perda de força', 'boca torta', 'fala enrolada', 'fala embolada', 'avc', 'derrame', 'paralisia', 'dormência de um lado', 'não consegue falar', 'deficit', 'déficit'],
  systems: ['neurologico', 'cardiovascular'],
  isPain: false,
  sections: [
    {
      id: 'tempo',
      title: 'Tempo — o mais importante',
      branch: { tone: 'red', reason: () => 'Tempo é cérebro: a hora define trombólise e trombectomia.' },
      questions: [
        {
          id: 'dn_lkw',
          label: 'Última vez em que foi visto(a) bem (data e hora)',
          type: 'text',
          placeholder: 'Ex.: hoje às 07h30',
          short: 'Última vez visto bem',
          narrative: (v) => `Última vez visto bem: ${String(v)}`,
          why: {
            reason:
              'Se o início não foi presenciado, conta-se a partir da última vez em que o paciente foi visto sem sintomas — não da hora em que foi encontrado.',
            impact: 'Define a elegibilidade para trombólise endovenosa (nas primeiras horas, classicamente até 4,5 h) e para trombectomia em casos selecionados até 24 h. Acione o protocolo de AVC já.',
            refs: ['aha-avc-2026'],
          },
        },
        {
          id: 'dn_acordou',
          label: 'Acordou com o problema?',
          type: 'yesno',
          yesText: 'Déficit percebido ao despertar',
          noText: 'Início presenciado/acordado',
          why: {
            reason: 'No AVC ao despertar, o horário de início é desconhecido; a última vez visto bem é quando foi dormir.',
            impact: 'Pode ainda ser candidato a tratamento guiado por imagem — não descartar automaticamente.',
            refs: ['aha-avc-2026'],
          },
        },
      ],
    },
    {
      id: 'deficits',
      title: 'O que aconteceu',
      prose: 'list',
      questions: [
        associatedQ(
          ['deficit_motor', 'parestesia', 'alteracao_fala', 'desvio_rima', 'perda_visual_subita', 'diplopia', 'desequilibrio', 'vertigem', 'cefaleia', 'vomitos', 'confusao', 'convulsao'],
          'Sinais e sintomas',
        ),
        {
          id: 'dn_lado',
          label: 'Lado acometido',
          type: 'single',
          options: [
            opt('direito', 'Direito', undefined, 'à direita'),
            opt('esquerdo', 'Esquerdo', undefined, 'à esquerda'),
            opt('bilateral', 'Dos dois lados', 'orange', 'bilateral'),
          ],
          short: 'Lado',
          narrative: (v, _c, q) => `acometendo ${labelsOf(q.options, v)[0]}`,
        },
        {
          id: 'dn_curso',
          label: 'Como está agora?',
          type: 'single',
          options: [
            opt('resolveu', 'Voltou ao normal', 'orange', 'com resolução completa (possível AIT)'),
            opt('melhorando', 'Melhorando', undefined, 'em melhora'),
            opt('igual', 'Igual', undefined, 'estável'),
            opt('piorando', 'Piorando', 'red', 'em piora'),
            opt('flutuante', 'Vai e volta', 'red', 'flutuante'),
          ],
          short: 'Curso',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'Resolução completa sugere ataque isquêmico transitório (AIT), que tem alto risco de AVC nos dias seguintes. Curso flutuante ou em piora sugere AVC em evolução (ex.: oclusão de grande vaso, estenose crítica).',
            impact: 'AIT → investigação rápida (neuroimagem, angiotomografia/Doppler de carótidas, ECG/monitorização) e prevenção secundária imediata.',
            refs: ['aha-avc-2026'],
          },
        },
      ],
    },
    {
      id: 'imitadores',
      title: 'Imitadores de AVC',
      branch: { tone: 'orange', reason: () => 'Afastar os principais imitadores — sem atrasar o protocolo.' },
      note: 'Glicemia capilar é obrigatória antes de qualquer decisão: hipoglicemia causa déficit focal.',
      questions: [
        {
          id: 'dn_imitadores',
          label: 'Pistas de imitador',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('hipoglicemia', 'Diabetes em insulina/sulfonilureia, jejum', 'orange', 'risco de hipoglicemia'),
            opt('crise', 'Convulsão antes do déficit', 'orange', 'crise convulsiva precedendo o déficit (paralisia de Todd?)'),
            opt('enxaqueca', 'Enxaqueca com aura conhecida, sintomas que “marcham”', undefined, 'história de enxaqueca com aura'),
            opt('trauma', 'Queda/trauma na cabeça', 'red', 'trauma craniano'),
            opt('infeccao', 'Febre/infecção', 'orange', 'febre/infecção'),
            opt('intoxicacao', 'Álcool/drogas/medicamentos sedativos', 'orange', 'possível intoxicação'),
          ],
          short: 'Imitadores',
          why: {
            reason: 'Hipoglicemia, crise convulsiva (paralisia pós-ictal), enxaqueca com aura, infecções e intoxicações podem simular AVC.',
            impact: 'Glicemia, história de crise e neuroimagem diferenciam — mas na dúvida o protocolo segue.',
            refs: ['aha-avc-2026'],
          },
        },
      ],
    },
    {
      id: 'tratamento',
      title: 'Informações para o tratamento',
      questions: [
        {
          id: 'dn_antitrombotico',
          label: 'Usa anticoagulante ou antiagregante?',
          type: 'multi',
          options: ANTITHROMBOTIC_OPTIONS,
          short: 'Antitrombóticos',
          narrative: (v) => {
            const vals = v as string[];
            if (vals.includes('nenhum')) return 'Não usa antitrombóticos';
            return `Em uso de ${joinPt(labelsOf(ANTITHROMBOTIC_OPTIONS, vals).map((l) => l.toLowerCase()))}`;
          },
          why: {
            reason: 'Anticoagulante pode contraindicar a trombólise (depende do fármaco, da dose e da última tomada) e aumenta o risco de hemorragia.',
            impact: 'Registrar o nome e o horário da última dose; pedir coagulograma.',
            refs: ['aha-avc-2026'],
          },
        },
        {
          id: 'dn_contra',
          label: 'Situações que pesam na trombólise',
          type: 'multi',
          options: [
            opt('cirurgia', 'Cirurgia grande nas últimas 2 semanas', 'orange'),
            opt('sangramento', 'Sangramento recente (digestivo, urinário)', 'orange'),
            opt('avc_previo', 'AVC ou trauma craniano nos últimos 3 meses', 'orange'),
            opt('hemorragia_previa', 'Hemorragia cerebral prévia', 'red'),
            opt('nenhuma', 'Nenhuma'),
          ],
          short: 'Contraindicações possíveis',
          narrative: (v, _c, q) => {
            const vals = v as string[];
            if (vals.includes('nenhuma')) return 'Nega situações que contraindiquem trombólise';
            return `Possíveis contraindicações à trombólise: ${joinPt(labelsOf(q.options, vals))}`;
          },
          why: {
            reason: 'São itens do checklist de trombólise; perguntar logo evita atraso quando o paciente chegar à TC.',
            impact: 'A decisão final segue o protocolo institucional e a avaliação do neurologista.',
            refs: ['aha-avc-2026'],
          },
        },
        {
          id: 'dn_fr',
          label: 'Fatores de risco vascular',
          type: 'multi',
          options: [
            opt('has', 'Hipertensão'),
            opt('dm', 'Diabetes'),
            opt('fa', 'Fibrilação atrial', 'orange'),
            opt('tabagismo', 'Tabagismo'),
            opt('dislipidemia', 'Colesterol alto'),
            opt('avc_ait', 'AVC/AIT prévio', 'orange'),
            opt('cardiopatia', 'Doença do coração'),
          ],
          short: 'Fatores de risco vascular',
          narrative: (v, _c, q) => `Fatores de risco vascular: ${joinPt(labelsOf(q.options, v))}`,
          extra: true,
        },
      ],
    },
    finalSection(),
  ],
};
