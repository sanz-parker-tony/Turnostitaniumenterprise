
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'assets', filename)
      }
    },
  }
}

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss(), figmaAssetResolver()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    target: 'esnext',
    outDir: '../../dist/frontend',
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
});
