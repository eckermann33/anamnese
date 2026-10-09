import type { Vitals } from '../db/types';
import type { Profile } from './types';
import { formatNumber } from '../lib/format';

/* ==========================================================================
   SINAIS VITAIS: faixas de referência e classificação automática
   --------------------------------------------------------------------------
   Adultos: limites práticos de triagem (qSOFA usa FR ≥ 22 e PAS ≤ 100).
   Pediatria: faixas por idade (PALS/AHA). Valores fora → destaque laranja;
   muito fora → vermelho.
   ========================================================================== */

export type VitalKey = 'pas' | 'pad' | 'fc' | 'fr' | 'temp' | 'spo2' | 'glicemia' | 'dor';
export type VitalTone = 'green' | 'orange' | 'red';

export interface VitalStatus {
  tone: VitalTone;
  message?: string;
}

export const VITAL_META: Record<VitalKey, { label: string; short: string; unit: string; min: number; max: number; decimals: number }> = {
  pas: { label: 'PA sistólica', short: 'PAS', unit: 'mmHg', min: 30, max: 300, decimals: 0 },
  pad: { label: 'PA diastólica', short: 'PAD', unit: 'mmHg', min: 10, max: 200, decimals: 0 },
  fc: { label: 'Frequência cardíaca', short: 'FC', unit: 'bpm', min: 10, max: 300, decimals: 0 },
  fr: { label: 'Frequência respiratória', short: 'FR', unit: 'irpm', min: 2, max: 100, decimals: 0 },
  temp: { label: 'Temperatura axilar', short: 'Tax', unit: '°C', min: 28, max: 44, decimals: 1 },
  spo2: { label: 'Saturação de O₂', short: 'SpO₂', unit: '%', min: 40, max: 100, decimals: 0 },
  glicemia: { label: 'Glicemia capilar', short: 'HGT', unit: 'mg/dL', min: 10, max: 900, decimals: 0 },
  dor: { label: 'Dor', short: 'Dor', unit: '/10', min: 0, max: 10, decimals: 0 },
};

/** Faixas pediátricas (FC e FR acordado) por idade em anos — PALS. */
function pediatricRanges(ageYears: number) {
  if (ageYears < 1 / 12) return { fc: [100, 205], fr: [30, 60], pasMin: 60 }; // neonato
  if (ageYears < 1) return { fc: [100, 180], fr: [30, 53], pasMin: 70 };
  if (ageYears < 3) return { fc: [98, 140], fr: [22, 37], pasMin: 70 + 2 * ageYears };
  if (ageYears < 6) return { fc: [80, 120], fr: [20, 28], pasMin: 70 + 2 * ageYears };
  if (ageYears < 12) return { fc: [75, 118], fr: [18, 25], pasMin: Math.min(90, 70 + 2 * ageYears) };
  return { fc: [60, 100], fr: [12, 20], pasMin: 90 };
}

interface Ctx {
  ageYears?: number;
  profile: Profile;
}

export function classifyVital(key: VitalKey, value: number | undefined, ctx: Ctx, vitals?: Vitals): VitalStatus | null {
  if (value === undefined || Number.isNaN(value)) return null;
  const ped = ctx.profile === 'pediatria' && ctx.ageYears !== undefined && ctx.ageYears < 18;

  switch (key) {
    case 'pas': {
      const min = ped ? pediatricRanges(ctx.ageYears!).pasMin : 90;
      if (value < min) return { tone: 'red', message: 'Hipotensão' };
      if (!ped && value <= 100) return { tone: 'orange', message: 'PAS ≤ 100 (critério do qSOFA)' };
      if (!ped && value >= 180) return { tone: 'red', message: 'PA muito elevada (≥ 180): avaliar lesão de órgão-alvo' };
      if (ctx.profile === 'gestante' && value >= 160) return { tone: 'red', message: 'PAS ≥ 160 na gestação: hipertensão grave' };
      if (!ped && value >= 140) return { tone: 'orange', message: 'PA elevada' };
      return { tone: 'green' };
    }
    case 'pad': {
      if (ped) return { tone: 'green' };
      if (ctx.profile === 'gestante' && value >= 110) return { tone: 'red', message: 'PAD ≥ 110 na gestação: hipertensão grave' };
      if (value >= 120) return { tone: 'red', message: 'PAD ≥ 120' };
      if (value >= 90) return { tone: 'orange', message: 'PAD elevada' };
      if (value < 60) return { tone: 'orange', message: 'PAD baixa' };
      return { tone: 'green' };
    }
    case 'fc': {
      if (ped) {
        const [lo, hi] = pediatricRanges(ctx.ageYears!).fc;
        if (value < lo * 0.8 || value > hi * 1.2) return { tone: 'red', message: 'FC muito fora da faixa para a idade' };
        if (value < lo || value > hi) return { tone: 'orange', message: `Faixa esperada: ${lo}–${hi} bpm` };
        return { tone: 'green' };
      }
      if (value < 40 || value >= 130) return { tone: 'red', message: value < 40 ? 'Bradicardia grave' : 'Taquicardia importante' };
      if (value < 50) return { tone: 'orange', message: 'Bradicardia' };
      if (value > 100) return { tone: 'orange', message: 'Taquicardia' };
      return { tone: 'green' };
    }
    case 'fr': {
      if (ped) {
        const [lo, hi] = pediatricRanges(ctx.ageYears!).fr;
        if (value > hi * 1.3 || value < lo * 0.6) return { tone: 'red', message: 'FR muito fora da faixa para a idade' };
        if (value < lo || value > hi) return { tone: 'orange', message: `Faixa esperada: ${lo}–${hi} irpm` };
        return { tone: 'green' };
      }
      if (value < 8 || value > 30) return { tone: 'red', message: value < 8 ? 'Bradipneia' : 'Taquipneia importante' };
      if (value >= 22) return { tone: 'orange', message: 'FR ≥ 22 (critério do qSOFA)' };
      if (value < 12) return { tone: 'orange', message: 'FR baixa' };
      return { tone: 'green' };
    }
    case 'temp': {
      if (value < 35) return { tone: 'red', message: 'Hipotermia' };
      if (value >= 40) return { tone: 'red', message: 'Febre alta (≥ 40 °C)' };
      if (value >= 37.8) return { tone: 'orange', message: 'Febre' };
      if (value < 36) return { tone: 'orange', message: 'Temperatura < 36 °C' };
      return { tone: 'green' };
    }
    case 'spo2': {
      const onO2 = vitals?.o2;
      if (value < 90) return { tone: 'red', message: onO2 ? 'Hipoxemia mesmo com O₂' : 'Hipoxemia (< 90%)' };
      if (value < 94) return { tone: 'orange', message: 'SpO₂ < 94% (em DPOC, alvo de 88–92%)' };
      if (onO2) return { tone: 'orange', message: 'Em O₂ suplementar' };
      return { tone: 'green' };
    }
    case 'glicemia': {
      if (value < 70) return { tone: 'red', message: 'Hipoglicemia' };
      if (value >= 300) return { tone: 'red', message: 'Hiperglicemia importante (≥ 300): avaliar cetoacidose/estado hiperosmolar' };
      if (value > 180) return { tone: 'orange', message: 'Hiperglicemia' };
      return { tone: 'green' };
    }
    case 'dor': {
      if (value >= 7) return { tone: 'orange', message: 'Dor intensa: priorizar analgesia' };
      return { tone: 'green' };
    }
  }
}

/** Pressão arterial média. */
export function meanArterialPressure(v: Vitals): number | undefined {
  if (v.pas === undefined || v.pad === undefined) return undefined;
  return Math.round((v.pas + 2 * v.pad) / 3);
}

/** Índice de choque = FC / PAS (≥ 1 sugere choque/hipovolemia importante). */
export function shockIndex(v: Vitals): number | undefined {
  if (!v.fc || !v.pas) return undefined;
  return v.fc / v.pas;
}

export function bmi(weightKg?: number, heightM?: number): number | undefined {
  if (!weightKg || !heightM) return undefined;
  const h = heightM > 3 ? heightM / 100 : heightM; // aceita 175 (cm) ou 1,75 (m)
  return weightKg / (h * h);
}

export function bmiClass(value: number, ageYears?: number): { label: string; tone: VitalTone } {
  if (ageYears !== undefined && ageYears < 18) return { label: 'use curvas de IMC por idade (OMS)', tone: 'green' };
  if (ageYears !== undefined && ageYears >= 60) {
    // Ponto de corte usado no Brasil para idosos (Lipschitz)
    if (value < 22) return { label: 'baixo peso (idoso)', tone: 'orange' };
    if (value <= 27) return { label: 'eutrofia (idoso)', tone: 'green' };
    return { label: 'sobrepeso (idoso)', tone: 'orange' };
  }
  if (value < 18.5) return { label: 'baixo peso', tone: 'orange' };
  if (value < 25) return { label: 'eutrofia', tone: 'green' };
  if (value < 30) return { label: 'sobrepeso', tone: 'orange' };
  if (value < 35) return { label: 'obesidade grau I', tone: 'orange' };
  if (value < 40) return { label: 'obesidade grau II', tone: 'red' };
  return { label: 'obesidade grau III', tone: 'red' };
}

/** Texto dos sinais vitais para o prontuário. */
export function vitalsText(v: Vitals): string {
  const parts: string[] = [];
  if (v.pas !== undefined && v.pad !== undefined) parts.push(`PA ${v.pas}x${v.pad} mmHg`);
  else if (v.pas !== undefined) parts.push(`PAS ${v.pas} mmHg`);
  if (v.fc !== undefined) parts.push(`FC ${v.fc} bpm`);
  if (v.fr !== undefined) parts.push(`FR ${v.fr} irpm`);
  if (v.temp !== undefined) parts.push(`Tax ${formatNumber(v.temp, 1)} °C`);
  if (v.spo2 !== undefined)
    parts.push(`SpO₂ ${v.spo2}% ${v.o2 ? `em O₂${v.o2Flow ? ` a ${formatNumber(v.o2Flow, 1)} L/min` : ''}` : 'em ar ambiente'}`);
  if (v.glicemia !== undefined) parts.push(`HGT ${v.glicemia} mg/dL`);
  if (v.dor !== undefined) parts.push(`dor ${v.dor}/10`);
  return parts.join(', ');
}
