/**
 * Confere o contraste (WCAG 2.x) das cores do design system.
 *
 * Lê src/styles/tokens.css, pega o bloco claro (:root) e o escuro
 * (:root[data-theme='dark']), resolve as cores com transparência sobre o
 * fundo onde elas aparecem e compara com o mínimo AA:
 *   - texto normal ........ 4,5:1
 *   - elementos de UI ..... 3:1 (ícones, bordas de foco, barra de progresso)
 *
 * Uso: npm run check:contrast   (sai com código 1 se algum par falhar)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');

/** Extrai as variáveis de cor do primeiro bloco que começa com `selector {`. */
function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Bloco não encontrado: ${selector}`);
  const end = css.indexOf('\n}', start);
  const out = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/gi)) out[m[1]] = m[2];
  return out;
}

function parse(color) {
  if (color.startsWith('#')) {
    let h = color.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
  return [r, g, b, a];
}

/** Compõe uma cor (com alfa) sobre um fundo opaco. */
function over([r, g, b, a], [br, bg, bb]) {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
}

function luminance([r, g, b]) {
  const ch = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function ratio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// [frente, fundo, camada sob o fundo (se o fundo for translúcido), mínimo, descrição]
const PAIRS = [
  ['label', 'surface', null, 4.5, 'texto principal em card'],
  ['label', 'bg', null, 4.5, 'texto principal no fundo'],
  ['label-2', 'surface', null, 4.5, 'texto secundário em card'],
  ['label-2', 'bg', null, 4.5, 'texto secundário no fundo'],
  ['label-3', 'surface', null, 4.5, 'placeholder em card'],
  ['label-3', 'fill', 'surface', 4.5, 'placeholder em campo'],
  ['label', 'fill', 'surface', 4.5, 'chip não selecionado'],
  ['accent-text', 'surface', null, 4.5, 'link azul em card'],
  ['accent-text', 'bg', null, 4.5, 'link azul no fundo'],
  ['accent-text', 'accent-tint', 'surface', 4.5, 'botão tinted / chip selecionado'],
  ['label-inverse', 'accent-fill', null, 4.5, 'botão azul preenchido', true],
  ['#ffffff', 'accent-glass', 'surface', 4.5, 'botão de vidro azul sobre card'],
  ['#ffffff', 'accent-glass', 'bg', 4.5, 'botão de vidro azul sobre fundo'],
  ['red-text', 'surface', null, 4.5, 'texto vermelho em card'],
  ['red-text', 'red-tint', 'surface', 4.5, 'tag vermelha'],
  ['#ffffff', 'red-fill', null, 4.5, 'banner de red flag'],
  ['orange-text', 'surface', null, 4.5, 'texto laranja em card'],
  ['orange-text', 'orange-tint', 'surface', 4.5, 'tag laranja'],
  ['on-orange', 'orange-fill', null, 4.5, 'botão laranja'],
  ['green-text', 'surface', null, 4.5, 'texto verde em card'],
  ['green-text', 'green-tint', 'surface', 4.5, 'tag verde'],
  ['accent', 'surface', null, 3, 'ícone / toggle / foco (UI)'],
  ['red', 'surface', null, 3, 'ícone vermelho (UI)'],
];

let failures = 0;
for (const [theme, selector] of [
  ['claro', ':root'],
  ['escuro', ":root[data-theme='dark']"],
]) {
  const t = { ...tokens(':root'), ...(selector === ':root' ? {} : tokens(selector)) };
  const get = (name) => parse(name.startsWith('#') ? name : t[name] ?? (() => { throw new Error(`Token ausente: --${name}`); })());
  console.log(`\nTema ${theme}`);
  for (const [fgName, bgName, baseName, min, label, alwaysWhite] of PAIRS) {
    // o texto do botão preenchido é sempre branco, nos dois temas
    const fgRaw = alwaysWhite ? parse('#ffffff') : get(fgName);
    let bg = get(bgName);
    if (bg[3] < 1) bg = over(bg, get(baseName ?? 'surface'));
    const fg = fgRaw[3] < 1 ? over(fgRaw, bg) : fgRaw;
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1  (mín. ${min})  ${label}`);
  }
}

console.log(failures ? `\n${failures} par(es) abaixo do AA.` : '\nTodos os pares passam no WCAG AA.');
process.exit(failures ? 1 : 0);
