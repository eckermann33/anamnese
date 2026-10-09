import type { ComplaintTemplate } from '../types';
import { associatedQ, evolutionQ, finalSection, imunoQ, labelsOf, onsetQ, opt } from './common';
import { joinPt } from '../../lib/format';

export const diarreia: ComplaintTemplate = {
  id: 'diarreia',
  name: 'Diarreia',
  subject: 'Diarreia',
  description: 'Aguda × crônica, desidratação, disenteria, epidemiologia (alimento, viagem, antibiótico → C. difficile) e sinais de causa orgânica.',
  keywords: ['diarreia', 'diarréia', 'fezes moles', 'fezes líquidas', 'evacuações líquidas', 'soltura', 'disenteria', 'intestino solto'],
  systems: ['digestorio', 'endocrino', 'hematologico'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Características',
      prose: 'list',
      questions: [
        onsetQ(),
        {
          id: 'dia_freq',
          label: 'Quantas evacuações por dia?',
          type: 'number',
          unit: 'vezes/dia',
          min: 1,
          max: 50,
          short: 'Frequência',
          narrative: (v) => `com ${v} evacuações por dia`,
          computed: (c) => {
            const d = c.complaintDays;
            if (d === undefined) return null;
            if (d < 14) return { text: 'Diarreia aguda (< 14 dias)', tone: 'green' };
            if (d < 28) return { text: 'Diarreia persistente (14 a 29 dias)', tone: 'orange' };
            return { text: 'Diarreia crônica (≥ 30 dias)', tone: 'orange' };
          },
          why: {
            reason:
              'Diarreia = 3 ou mais evacuações amolecidas em 24 h. A duração separa aguda (< 14 dias, quase sempre infecciosa e autolimitada), persistente (14–29 dias) e crônica (≥ 30 dias, investigar causas não infecciosas).',
            impact: 'Persistente/crônica → exames dirigidos (parasitológico, sangue oculto, calprotectina, função tireoidiana, sorologia para doença celíaca conforme a suspeita).',
            refs: ['idsa-diarreia-2017'],
          },
        },
        {
          id: 'dia_aspecto',
          label: 'Como são as fezes?',
          type: 'multi',
          options: [
            opt('aquosa', 'Aquosas', undefined, 'aquosas'),
            opt('pastosa', 'Pastosas', undefined, 'pastosas'),
            opt('muco', 'Com muco', 'orange', 'com muco'),
            opt('sangue', 'Com sangue', 'red', 'com sangue'),
            opt('gordurosa', 'Gordurosas, boiam, difíceis de dar descarga', 'orange', 'esteatorreicas'),
            opt('volumosa', 'Grande volume', undefined, 'volumosas'),
            opt('pouco_volume', 'Pouco volume, muitas vezes, com cólica/puxo', undefined, 'de pequeno volume com tenesmo'),
          ],
          short: 'Aspecto',
          narrative: (v, _c, q) => `fezes ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'Grande volume, aquosa, poucas vezes → delgado (alta). Pequeno volume, muitas vezes, com tenesmo, muco/sangue → cólon (baixa, inflamatória/invasiva). Esteatorreia → má absorção (pâncreas, celíaca).',
            impact: 'Sangue = disenteria: maior chance de bactéria invasiva (Shigella, Salmonella, Campylobacter, E. coli produtora de toxina Shiga), amebíase ou doença inflamatória intestinal.',
            refs: ['idsa-diarreia-2017'],
          },
        },
        {
          id: 'dia_noturna',
          label: 'Acorda à noite para evacuar?',
          type: 'yesno',
          yesText: 'Com evacuações noturnas',
          noText: 'Sem evacuações noturnas',
          why: {
            reason: 'Diarreia que acorda o paciente sugere causa orgânica; no intestino irritável ela costuma não ocorrer durante o sono.',
            impact: 'Presente → menor limiar para investigação.',
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ(['febre', 'nauseas', 'vomitos', 'dor_abdominal', 'distensao', 'hematoquezia', 'melena', 'perda_peso', 'astenia', 'oliguria', 'artralgia', 'exantema']),
      ],
    },
    {
      id: 'desidratacao',
      title: 'Desidratação',
      branch: { tone: 'orange', reason: () => 'Sempre avaliar o grau de desidratação na diarreia.' },
      questions: [
        {
          id: 'dia_desidratacao',
          label: 'Sinais de desidratação',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('sede', 'Muita sede', 'orange', 'sede intensa'),
            opt('boca_seca', 'Boca seca', 'orange', 'boca seca'),
            opt('urina_pouca', 'Urinando pouco / urina escura', 'orange', 'oligúria'),
            opt('tontura_levantar', 'Tontura ao levantar', 'orange', 'tontura postural'),
            opt('nao_bebe', 'Não consegue beber ou vomita tudo', 'red', 'incapaz de manter hidratação oral'),
            opt('letargia', 'Sonolência ou confusão', 'red', 'letargia/confusão'),
          ],
          short: 'Desidratação',
          why: {
            reason: 'A principal complicação da diarreia aguda é a desidratação, e ela define o tratamento (soro de reidratação oral × hidratação venosa).',
            impact: 'Incapaz de beber, letargia ou sinais de choque → hidratação venosa imediata. Grupos de risco: idosos, crianças pequenas, gestantes e imunossuprimidos.',
            refs: ['idsa-diarreia-2017'],
          },
        },
      ],
    },
    {
      id: 'epidemiologia',
      title: 'Epidemiologia',
      questions: [
        {
          id: 'dia_epi',
          label: 'Exposições',
          type: 'multi',
          options: [
            opt('alimento', 'Alimento suspeito / outras pessoas doentes'),
            opt('agua', 'Água não tratada / enchente'),
            opt('viagem', 'Viagem recente'),
            opt('atb', 'Antibiótico nas últimas 12 semanas', 'orange'),
            opt('internacao', 'Internação recente', 'orange'),
            opt('creche', 'Creche/instituição'),
            opt('sexual', 'Sexo anal desprotegido'),
          ],
          short: 'Exposições',
          narrative: (v, _c, q) => `Exposições: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'Surto a partir de alimento sugere toxina pré-formada (início em horas) ou bactéria; antibiótico ou internação recente sugerem Clostridioides difficile; viagem, água não tratada e enchentes ampliam o diferencial (parasitas, leptospirose).',
            impact: 'Antibiótico recente → pesquisar C. difficile. Exposição de risco → exames dirigidos e notificação de surto.',
            refs: ['idsa-diarreia-2017'],
          },
        },
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de alarme',
      branch: { tone: 'red', reason: () => 'Indicam exames, hidratação venosa ou internação.' },
      questions: [
        {
          id: 'dia_alarme',
          label: 'Sinais de alarme',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('sangue', 'Sangue nas fezes', 'red', 'disenteria'),
            opt('febre_alta', 'Febre ≥ 38,5 °C', 'orange', 'febre alta'),
            opt('dor_intensa', 'Dor abdominal intensa', 'red', 'dor abdominal intensa'),
            opt('mais_7d', 'Mais de 7 dias sem melhora', 'orange', 'duração > 7 dias sem melhora'),
            opt('idoso_imuno', 'Idoso, gestante ou imunossuprimido', 'orange', 'grupo de risco (idoso/gestante/imunossuprimido)'),
            opt('perda_peso', 'Perda de peso', 'orange', 'perda de peso'),
          ],
          short: 'Sinais de alarme',
          why: {
            reason: 'A maioria das diarreias agudas é viral e autolimitada; estes sinais identificam quem precisa de exames de fezes, antibiótico ou internação.',
            impact: 'Disenteria com febre → coprocultura e considerar antibiótico. Dor desproporcional → excluir abdome agudo (isquemia mesentérica, apendicite).',
            refs: ['idsa-diarreia-2017'],
          },
        },
        imunoQ(),
      ],
    },
    {
      id: 'ramo_cronica',
      title: 'Ramo diarreia crônica',
      showIf: (c) => (c.complaintDays ?? 0) >= 28,
      branch: { tone: 'accent', reason: () => 'Aberto porque: diarreia há 4 semanas ou mais.' },
      questions: [
        {
          id: 'dc_pistas',
          label: 'Pistas para a causa',
          type: 'multi',
          options: [
            opt('alterna', 'Alterna com prisão de ventre'),
            opt('estresse', 'Piora com estresse, alívio ao evacuar'),
            opt('leite', 'Piora com leite/derivados'),
            opt('gluten', 'Piora com pão/massas (glúten)'),
            opt('alcool', 'Consumo de álcool importante'),
            opt('tireoide', 'Calor, tremor, palpitação (tireoide)'),
            opt('dii_familia', 'Familiar com doença de Crohn/retocolite', 'orange'),
            opt('ccr_familia', 'Familiar com câncer de intestino', 'orange'),
            opt('mais_50', 'Mudança do hábito intestinal após os 50 anos', 'red'),
          ],
          short: 'Pistas para diarreia crônica',
          narrative: (v, _c, q) => `Na diarreia crônica, refere: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'Diarreia crônica tem causas funcionais (intestino irritável), inflamatórias (DII), de má absorção (celíaca, intolerância à lactose, pâncreas), endócrinas (hipertireoidismo) e neoplásicas.',
            impact: 'Mudança do hábito intestinal após os 50 anos, sangue, anemia ou perda de peso → colonoscopia.',
          },
        },
      ],
    },
    finalSection(),
  ],
};
