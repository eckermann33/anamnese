import { useId, useState, type KeyboardEvent, type SVGProps } from 'react';
import { X } from 'lucide-react';
import type { BodyMapValue } from '../../clinical/types';
import { regionLabel } from '../../clinical/bodyRegions';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Chip } from '../ui/Chip';

/* ==========================================================================
   MAPA CORPORAL CLICÁVEL
   --------------------------------------------------------------------------
   Toque nas regiões para marcar LOCALIZAÇÃO (azul) ou IRRADIAÇÃO (laranja).
   Vista de frente e de costas; para cefaleia, cabeça em detalhe.
   Lembre: na vista de FRENTE, o lado direito do paciente fica à esquerda da
   tela (posição anatômica).
   ========================================================================== */

type Shape =
  | { id: string; t: 'rect'; x: number; y: number; w: number; h: number; r?: number; clip?: 'head' | 'torso' }
  | { id: string; t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; clip?: 'head' | 'torso' };

const R = (id: string, x: number, y: number, w: number, h: number, r = 0, clip?: 'head' | 'torso'): Shape => ({ id, t: 'rect', x, y, w, h, r, clip });
const E = (id: string, cx: number, cy: number, rx: number, ry: number, clip?: 'head' | 'torso'): Shape => ({ id, t: 'ellipse', cx, cy, rx, ry, clip });

const HEAD = { cx: 110, cy: 40, rx: 26, ry: 31 };
const TORSO_PATH = 'M74,92 L146,92 Q160,96 160,112 L156,200 Q152,250 150,300 L70,300 Q68,250 64,200 L60,112 Q60,96 74,92 Z';

/** Membros e cabeça — comuns às duas vistas (com lados trocados). */
function limbs(view: 'front' | 'back'): Shape[] {
  // Na vista de frente, o lado DIREITO do paciente fica à esquerda da tela.
  const L = view === 'front' ? 'd' : 'e'; // lado que aparece à esquerda
  const Rr = view === 'front' ? 'e' : 'd';
  const upperL = L === 'd' ? 'msd' : 'mse';
  const upperR = Rr === 'd' ? 'msd' : 'mse';
  const lowerL = L === 'd' ? 'mid' : 'mie';
  const lowerR = Rr === 'd' ? 'mid' : 'mie';
  const shapes: Shape[] = [
    E(`ombro_${L}`, 66, 104, 16, 12),
    E(`ombro_${Rr}`, 154, 104, 16, 12),
    R(`${upperL}_braco`, 38, 114, 20, 82, 10),
    R(`${upperR}_braco`, 162, 114, 20, 82, 10),
    R(`${upperL}_antebraco`, 32, 198, 20, 76, 10),
    R(`${upperR}_antebraco`, 168, 198, 20, 76, 10),
    E(`${upperL}_mao`, 40, 291, 11, 15),
    E(`${upperR}_mao`, 180, 291, 11, 15),
  ];
  if (view === 'front') {
    shapes.push(
      R(`${lowerL}_coxa`, 74, 322, 32, 78, 14),
      R(`${lowerR}_coxa`, 114, 322, 32, 78, 14),
      R(`${lowerL}_joelho`, 76, 402, 28, 22, 10),
      R(`${lowerR}_joelho`, 116, 402, 28, 22, 10),
      R(`${lowerL}_perna`, 78, 426, 24, 58, 10),
      R(`${lowerR}_perna`, 118, 426, 24, 58, 10),
      E(`${lowerL}_pe`, 88, 493, 14, 7),
      E(`${lowerR}_pe`, 132, 493, 14, 7),
    );
  } else {
    shapes.push(
      R(`${lowerL}_posterior_coxa`, 74, 328, 32, 72, 14),
      R(`${lowerR}_posterior_coxa`, 114, 328, 32, 72, 14),
      R(`${lowerL}_poplitea`, 76, 402, 28, 22, 10),
      R(`${lowerR}_poplitea`, 116, 402, 28, 22, 10),
      R(`${lowerL}_panturrilha`, 78, 426, 24, 58, 10),
      R(`${lowerR}_panturrilha`, 118, 426, 24, 58, 10),
      E(`${lowerL}_calcanhar`, 88, 493, 12, 7),
      E(`${lowerR}_calcanhar`, 132, 493, 12, 7),
    );
  }
  return shapes;
}

const FRONT: Shape[] = [
  R('cabeca_cranio', 80, 0, 60, 46, 0, 'head'),
  R('face', 80, 46, 60, 14, 0, 'head'),
  R('pescoco_anterior', 99, 76, 22, 15, 6),
  // mandíbula: alvo próprio sobre o queixo (fácil de tocar, sem cair no pescoço)
  E('mandibula', 110, 66, 17, 8),
  // Tórax (o lado direito do paciente aparece à esquerda)
  R('torax_hemitorax_d', 50, 92, 48, 104, 0, 'torso'),
  R('torax_hemitorax_e', 122, 92, 48, 104, 0, 'torso'),
  R('torax_retroesternal', 98, 96, 24, 96, 6, 'torso'),
  R('torax_precordial', 123, 138, 28, 52, 10, 'torso'),
  // Abdome: 9 regiões
  R('abd_hipocondrio_d', 50, 196, 42, 36, 0, 'torso'),
  R('abd_epigastrio', 92, 196, 36, 36, 0, 'torso'),
  R('abd_hipocondrio_e', 128, 196, 42, 36, 0, 'torso'),
  R('abd_flanco_d', 50, 232, 42, 34, 0, 'torso'),
  R('abd_mesogastrio', 92, 232, 36, 34, 0, 'torso'),
  R('abd_flanco_e', 128, 232, 42, 34, 0, 'torso'),
  R('abd_fid', 50, 266, 42, 34, 0, 'torso'),
  R('abd_hipogastrio', 92, 266, 36, 34, 0, 'torso'),
  R('abd_fie', 128, 266, 42, 34, 0, 'torso'),
  R('inguinal_d', 72, 302, 30, 16, 7),
  R('genital', 102, 302, 16, 22, 7),
  R('inguinal_e', 118, 302, 30, 16, 7),
  ...limbs('front'),
];

const BACK: Shape[] = [
  R('cabeca_occipital', 80, 0, 60, 80, 0, 'head'),
  R('cervical_posterior', 99, 76, 22, 15, 6),
  // Costas: o lado esquerdo do paciente aparece à esquerda
  R('dorso_escapular_e', 50, 92, 48, 108, 0, 'torso'),
  R('dorso_escapular_d', 122, 92, 48, 108, 0, 'torso'),
  R('dorso_interescapular', 98, 96, 24, 104, 6, 'torso'),
  R('lombar_e', 50, 200, 48, 62, 0, 'torso'),
  R('lombar_d', 122, 200, 48, 62, 0, 'torso'),
  R('coluna_lombar', 98, 200, 24, 62, 6, 'torso'),
  R('gluteo_e', 70, 264, 38, 62, 16),
  R('gluteo_d', 112, 264, 38, 62, 16),
  R('sacral', 100, 262, 20, 30, 6),
  ...limbs('back'),
];

/* Cabeça em detalhe (cefaleia) */
const HEAD_FRONT_C = { cx: 65, cy: 92, rx: 46, ry: 56 };
const HEAD_BACK_C = { cx: 175, cy: 92, rx: 46, ry: 56 };
const HEAD_FRONT: Shape[] = [
  R('face', 15, 84, 100, 70, 0, 'head'),
  R('cabeca_frontal', 15, 50, 100, 34, 0, 'head'),
  R('cabeca_vertex', 15, 30, 100, 20, 0, 'head'),
  R('cabeca_temporal_d', 15, 66, 22, 58, 0, 'head'),
  R('cabeca_temporal_e', 93, 66, 22, 58, 0, 'head'),
  E('cabeca_periorbitaria_d', 47, 99, 13, 9),
  E('cabeca_periorbitaria_e', 83, 99, 13, 9),
];
const HEAD_BACK: Shape[] = [R('cabeca_occipital', 125, 30, 100, 124, 0, 'head'), R('cervical_posterior', 157, 146, 36, 30, 8)];

interface BodyMapProps {
  value: BodyMapValue | undefined;
  onChange: (v: BodyMapValue | undefined) => void;
  view?: 'full' | 'head';
}

export function BodyMap({ value, onChange, view = 'full' }: BodyMapProps) {
  const [mode, setMode] = useState<'location' | 'radiation'>('location');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const uid = useId().replace(/:/g, '');
  const v: BodyMapValue = value ?? { location: [], radiation: [] };

  function toggle(id: string) {
    const loc = new Set(v.location);
    const rad = new Set(v.radiation);
    if (mode === 'location') {
      if (loc.has(id)) loc.delete(id);
      else {
        loc.add(id);
        rad.delete(id);
      }
    } else {
      if (rad.has(id)) rad.delete(id);
      else {
        rad.add(id);
        loc.delete(id);
      }
    }
    const next = { location: [...loc], radiation: [...rad], noRadiation: rad.size ? false : v.noRadiation };
    onChange(next.location.length || next.radiation.length || next.noRadiation ? next : undefined);
  }

  function remove(id: string) {
    const next = { ...v, location: v.location.filter((x) => x !== id), radiation: v.radiation.filter((x) => x !== id) };
    onChange(next.location.length || next.radiation.length || next.noRadiation ? next : undefined);
  }

  const stateOf = (id: string) => (v.location.includes(id) ? 'location' : v.radiation.includes(id) ? 'radiation' : undefined);

  function renderShape(s: Shape, clipHead: string, clipTorso: string) {
    const st = stateOf(s.id);
    const label = regionLabel(s.id);
    const common: SVGProps<SVGElement> & Record<string, unknown> = {
      className: 'region',
      'data-state': st,
      role: 'checkbox',
      'aria-checked': !!st,
      'aria-label': `${label}${st === 'location' ? ' — localização' : st === 'radiation' ? ' — irradiação' : ''}`,
      tabIndex: 0,
      onClick: () => toggle(s.id),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(s.id);
        }
      },
      clipPath: s.clip === 'head' ? `url(#${clipHead})` : s.clip === 'torso' ? `url(#${clipTorso})` : undefined,
    };
    return s.t === 'rect' ? (
      <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...(common as SVGProps<SVGRectElement>)}>
        <title>{label}</title>
      </rect>
    ) : (
      <ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...(common as SVGProps<SVGEllipseElement>)}>
        <title>{label}</title>
      </ellipse>
    );
  }

  const selected = [...v.location.map((id) => ({ id, k: 'location' as const })), ...v.radiation.map((id) => ({ id, k: 'radiation' as const }))];

  return (
    <div className="bodymap stack gap-3">
      <SegmentedControl
        ariaLabel="O que marcar"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'location', label: <><span className="bodymap-dot" data-k="location" aria-hidden="true" />Localização</> },
          { value: 'radiation', label: <><span className="bodymap-dot" data-k="radiation" aria-hidden="true" />Irradiação</> },
        ]}
      />
      {view === 'full' && (
        <SegmentedControl
          ariaLabel="Vista"
          value={side}
          onChange={setSide}
          options={[
            { value: 'front', label: 'Frente' },
            { value: 'back', label: 'Costas' },
          ]}
        />
      )}
      <div className="bodymap-canvas">
        {view === 'full' ? (
          <svg viewBox="0 0 220 504" className="bodymap-svg" role="group" aria-label={side === 'front' ? 'Corpo — vista de frente' : 'Corpo — vista de costas'}>
            <defs>
              <clipPath id={`h${uid}`}>
                <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
              </clipPath>
              <clipPath id={`t${uid}`}>
                <path d={TORSO_PATH} />
              </clipPath>
            </defs>
            {(side === 'front' ? FRONT : BACK).map((s) => renderShape(s, `h${uid}`, `t${uid}`))}
            <text x="8" y="16" className="bodymap-side">{side === 'front' ? 'D' : 'E'}</text>
            <text x="204" y="16" className="bodymap-side" textAnchor="end">{side === 'front' ? 'E' : 'D'}</text>
          </svg>
        ) : (
          <svg viewBox="0 0 240 184" className="bodymap-svg bodymap-head" role="group" aria-label="Cabeça — frente e costas">
            <defs>
              <clipPath id={`hf${uid}`}>
                <ellipse {...HEAD_FRONT_C} />
              </clipPath>
              <clipPath id={`hb${uid}`}>
                <ellipse {...HEAD_BACK_C} />
              </clipPath>
            </defs>
            {HEAD_FRONT.map((s) => renderShape(s, `hf${uid}`, ''))}
            {HEAD_BACK.map((s) => renderShape(s, `hb${uid}`, ''))}
            <text x="65" y="18" className="bodymap-side" textAnchor="middle">Frente</text>
            <text x="175" y="18" className="bodymap-side" textAnchor="middle">Costas</text>
            <text x="12" y="104" className="bodymap-side">D</text>
            <text x="118" y="104" className="bodymap-side" textAnchor="end">E</text>
          </svg>
        )}
      </div>
      <div className="chip-group" aria-live="polite">
        {selected.map(({ id, k }) => (
          <button key={id} type="button" className="chip chip-sm" data-region-kind={k} onClick={() => remove(id)} aria-label={`Remover ${regionLabel(id)}`}>
            <span className="bodymap-dot" data-k={k} aria-hidden="true" />
            {regionLabel(id)}
            <X size={14} aria-hidden="true" />
          </button>
        ))}
        {!v.radiation.length && (
          <Chip
            small
            selected={!!v.noRadiation}
            onClick={() => {
              const next = { ...v, noRadiation: !v.noRadiation };
              onChange(next.location.length || next.noRadiation ? next : undefined);
            }}
          >
            Sem irradiação
          </Chip>
        )}
      </div>
    </div>
  );
}
