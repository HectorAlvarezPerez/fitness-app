import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(__dirname);
const previewStorePath = path.resolve(root, 'src/preview/store.ts');
const previewSupabasePath = path.resolve(root, 'src/preview/supabase.ts');
const previewPushPath = path.resolve(root, 'src/preview/push.ts');
const productModuleReplacements = new Map([
  [path.resolve(root, 'src/store/useStore.ts'), previewStorePath],
  [path.resolve(root, 'src/lib/supabaseClient.ts'), previewSupabasePath],
  [path.resolve(root, 'src/lib/push.ts'), previewPushPath],
]);

const previewProductModuleGuard: Plugin = {
  name: 'fitness-preview-product-module-guard',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer) return null;

    const cleanImporter = importer.split('?')[0];
    const cleanSource = source.split('?')[0];
    const sourcePath = cleanSource.startsWith('@/')
      ? path.resolve(root, 'src', cleanSource.slice(2))
      : path.resolve(path.dirname(cleanImporter), cleanSource);
    const candidates = [sourcePath, `${sourcePath}.ts`, `${sourcePath}.tsx`];

    for (const candidate of candidates) {
      const replacement = productModuleReplacements.get(path.resolve(candidate));
      if (replacement) return replacement;
    }

    return null;
  },
  load(id) {
    const canonicalId = path.resolve(id.split('?')[0]);
    if (productModuleReplacements.has(canonicalId)) {
      throw new Error(`Preview blocked a product runtime module: ${canonicalId}`);
    }
    return null;
  },
};

export default defineConfig({
  configFile: false,
  root,
  plugins: [previewProductModuleGuard, react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(root, 'src') },
    ],
  },
  server: { host: '127.0.0.1', port: 3107, strictPort: true },
});
