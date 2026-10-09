// Gera os ícones PNG do PWA a partir de public/favicon.svg (usa o Chromium do Playwright).
// Uso: npm run icons
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

async function render(size, file, { padding = 0, background = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - padding * 2;
  await page.setContent(
    `<html><body style="margin:0;background:${background};display:grid;place-items:center;width:${size}px;height:${size}px">
       <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
     </body></html>`,
  );
  await page.screenshot({ path: file, omitBackground: background === 'transparent' });
  console.log('ok', file);
}

await render(192, 'public/icons/icon-192.png');
await render(512, 'public/icons/icon-512.png');
// "maskable": o sistema recorta em círculo/quadrado — margem de segurança e fundo cheio
await render(512, 'public/icons/icon-maskable-512.png', { padding: 52, background: '#0062cc' });
// iPhone: sem transparência
await render(180, 'public/icons/apple-touch-icon.png', { background: '#0062cc' });
await browser.close();
