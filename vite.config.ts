import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom domain on GitHub Pages → base '/'.
// Default project URL only: VITE_BASE=/repo-name/ npm run build
const raw = process.env.VITE_BASE;
const base = raw != null && raw !== '' ? raw : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
