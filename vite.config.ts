import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// The browser build of @actual-app/api uses SharedArrayBuffer (via absurd-sql),
// which requires the page to be cross-origin isolated. Set COOP/COEP on every
// response, for BOTH the dev server and `vite preview` — and any production host
// must send these same two headers.
function setIsolationHeaders(res: { setHeader: (k: string, v: string) => void }): void {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

const crossOriginIsolation: PluginOption = {
  name: 'cross-origin-isolation',
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), crossOriginIsolation],
});
