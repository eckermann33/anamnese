/* ==========================================================================
   REGIÕES DO MAPA CORPORAL
   --------------------------------------------------------------------------
   IDs com prefixos para facilitar regras:
     torax_*  abd_*  cabeca_*  msd_* (membro superior direito)  mse_*
     mid_* (membro inferior direito)  mie_*  lombar_*  dorso_*
   "D" e "E" são sempre do PACIENTE (na vista de frente, o lado direito do
   paciente aparece à esquerda da tela).
   ========================================================================== */

export const BODY_REGION_LABEL: Record<string, string> = {
  // Cabeça e pescoço
  cabeca_cranio: 'cabeça',
  cabeca_frontal: 'região frontal',
  cabeca_vertex: 'vértice/região parietal',
  cabeca_temporal_d: 'região temporal direita',
  cabeca_temporal_e: 'região temporal esquerda',
  cabeca_periorbitaria_d: 'região periorbitária direita',
  cabeca_periorbitaria_e: 'região periorbitária esquerda',
  cabeca_occipital: 'região occipital',
  face: 'face',
  mandibula: 'mandíbula',
  pescoco_anterior: 'região cervical anterior',
  cervical_posterior: 'região cervical posterior (nuca)',

  // Tórax (frente)
  torax_retroesternal: 'região retroesternal',
  torax_precordial: 'região precordial',
  torax_hemitorax_d: 'hemitórax direito',
  torax_hemitorax_e: 'hemitórax esquerdo',
  ombro_d: 'ombro direito',
  ombro_e: 'ombro esquerdo',

  // Abdome (9 regiões)
  abd_hipocondrio_d: 'hipocôndrio direito',
  abd_epigastrio: 'epigástrio',
  abd_hipocondrio_e: 'hipocôndrio esquerdo',
  abd_flanco_d: 'flanco direito',
  abd_mesogastrio: 'mesogástrio (região periumbilical)',
  abd_flanco_e: 'flanco esquerdo',
  abd_fid: 'fossa ilíaca direita',
  abd_hipogastrio: 'hipogástrio',
  abd_fie: 'fossa ilíaca esquerda',
  inguinal_d: 'região inguinal direita',
  inguinal_e: 'região inguinal esquerda',
  genital: 'região genital',

  // Membros superiores
  msd_braco: 'braço direito',
  msd_antebraco: 'antebraço direito',
  msd_mao: 'mão direita',
  mse_braco: 'braço esquerdo',
  mse_antebraco: 'antebraço esquerdo',
  mse_mao: 'mão esquerda',

  // Membros inferiores (frente)
  mid_coxa: 'coxa direita',
  mid_joelho: 'joelho direito',
  mid_perna: 'perna direita',
  mid_pe: 'pé direito',
  mie_coxa: 'coxa esquerda',
  mie_joelho: 'joelho esquerdo',
  mie_perna: 'perna esquerda',
  mie_pe: 'pé esquerdo',

  // Costas
  dorso_escapular_d: 'região escapular direita',
  dorso_escapular_e: 'região escapular esquerda',
  dorso_interescapular: 'região interescapular (dorso)',
  lombar_d: 'região lombar direita',
  lombar_e: 'região lombar esquerda',
  coluna_lombar: 'coluna lombar',
  sacral: 'região sacral',
  gluteo_d: 'região glútea direita',
  gluteo_e: 'região glútea esquerda',
  mid_posterior_coxa: 'face posterior da coxa direita',
  mie_posterior_coxa: 'face posterior da coxa esquerda',
  mid_poplitea: 'fossa poplítea direita',
  mie_poplitea: 'fossa poplítea esquerda',
  mid_panturrilha: 'panturrilha direita',
  mie_panturrilha: 'panturrilha esquerda',
  mid_calcanhar: 'calcanhar direito',
  mie_calcanhar: 'calcanhar esquerdo',
};

export function regionLabel(id: string): string {
  return BODY_REGION_LABEL[id] ?? id.replace(/_/g, ' ');
}

/** Agrupa regiões bilaterais: ["torax_hemitorax_d","torax_hemitorax_e"] → "ambos os hemitórax" (simples). */
export function describeRegions(ids: string[]): string[] {
  const set = new Set(ids);
  const out: string[] = [];
  const pairs: Array<[string, string, string]> = [
    ['torax_hemitorax_d', 'torax_hemitorax_e', 'ambos os hemitórax'],
    ['cabeca_temporal_d', 'cabeca_temporal_e', 'regiões temporais bilateralmente'],
    ['cabeca_periorbitaria_d', 'cabeca_periorbitaria_e', 'regiões periorbitárias bilateralmente'],
    ['lombar_d', 'lombar_e', 'região lombar bilateralmente'],
    ['ombro_d', 'ombro_e', 'ambos os ombros'],
    ['mid_panturrilha', 'mie_panturrilha', 'ambas as panturrilhas'],
    ['mid_posterior_coxa', 'mie_posterior_coxa', 'face posterior de ambas as coxas'],
  ];
  for (const [a, b, label] of pairs) {
    if (set.has(a) && set.has(b)) {
      out.push(label);
      set.delete(a);
      set.delete(b);
    }
  }
  for (const id of ids) if (set.has(id)) out.push(regionLabel(id));
  return out;
}
