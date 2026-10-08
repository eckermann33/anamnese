import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_DESCRIPTION,
  THEME_COLOR_LIGHT,
} from './src/config/app.js';

/**
 * Plugin de desenvolvimento: expõe /api/ai no próprio servidor do Vite.
 *
 * Em produção, /api/ai é uma função serverless (Vercel: pasta /api,
 * Cloudflare: pasta /worker). Localmente, este plugin chama o MESMO
 * código (server/aiHandler.ts), lendo a chave do arquivo .env.local.
 * A chave fica só no processo Node do Vite — nunca vai para o navegador.
 */
function devApiPlugin(env: Record<string, string>): Plugin {
  const allowedHeaders = ['content-type', 'origin', 'x-access-code', 'authorization'];

  async function handle(server: ViteDevServer | PreviewServer, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const headers = new Headers();
      for (const name of allowedHeaders) {
        const value = req.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
      const request = new Request(`http://localhost${req.url ?? '/api/ai'}`, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      });
      // ssrLoadModule recarrega o handler quando você edita o código do servidor.
      const mod =
        'ssrLoadModule' in server
          ? ((await server.ssrLoadModule('/server/aiHandler.ts')) as typeof import('./server/aiHandler.js'))
          : await import('./server/aiHandler.js');
      const response = await mod.handleAiRequest(request, env);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Erro no servidor local de IA.', detail: String(error) }));
    }
  }

  return {
    name: 'anamnese-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', (req, res) => void handle(server, req, res));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai', (req, res) => void handle(server, req, res));
    },
  };
}

/** Substitui %APP_NAME% e %APP_DESCRIPTION% no index.html. */
function htmlAppNamePlugin(): Plugin {
  return {
    name: 'anamnese-html-app-name',
    transformIndexHtml(html) {
      return html
        .replaceAll('%APP_NAME%', APP_NAME)
        .replaceAll('%APP_DESCRIPTION%', APP_DESCRIPTION)
        .replaceAll('%THEME_COLOR_LIGHT%', THEME_COLOR_LIGHT);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Carrega TODAS as variáveis do .env.local (inclusive as sem VITE_) apenas
  // para o plugin do servidor local. Elas não são injetadas no front-end.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      htmlAppNamePlugin(),
      devApiPlugin(env),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: APP_NAME,
          short_name: APP_SHORT_NAME,
          description: APP_DESCRIPTION,
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: THEME_COLOR_LIGHT,
          theme_color: THEME_COLOR_LIGHT,
          categories: ['medical', 'education', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Tudo que o app precisa para funcionar offline fica no cache.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: '/index.html',
          // A IA nunca é cacheada: sempre vai para a rede.
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        devOptions: { enabled: false },
      }),
    ],
    build: {
      target: 'es2022',
      sourcemap: false,
    },
  };
});
