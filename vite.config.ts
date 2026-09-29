import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Génère public/sw.js au moment du build : met en cache tous les fichiers de l'application
 * pour qu'elle fonctionne 100 % hors ligne. Aucune dépendance supplémentaire.
 */
function serviceWorker(): Plugin {
  return {
    name: 'tcc-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const fichiersPublics = readdirSync('public').filter((f) => statSync(join('public', f)).isFile());
      const fichiers = ['./', ...Object.keys(bundle), ...fichiersPublics].map((f) => (f === './' ? f : `./${f}`));
      const empreinte = createHash('sha256');
      for (const f of Object.values(bundle)) empreinte.update(f.type === 'chunk' ? f.code : f.source);
      for (const f of fichiersPublics) empreinte.update(readFileSync(join('public', f)));
      const version = empreinte.digest('hex').slice(0, 12);
      const source = readFileSync('src/sw.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__FICHIERS__', JSON.stringify(fichiers));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/** Politique de sécurité (build uniquement) : aucune connexion vers un autre site que celui de l'application. */
function politiqueSecurite(): Plugin {
  const csp =
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'self'";
  return {
    name: 'tcc-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  // Chemins relatifs : l'application fonctionne quel que soit le dossier d'hébergement (ex. GitHub Pages).
  base: './',
  plugins: [react(), politiqueSecurite(), serviceWorker()],
  build: { target: 'safari16' },
});
