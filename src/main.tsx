import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { makePixelCursorDataUrl } from './cursor/pixelCursor';

const base = import.meta.env.BASE_URL;
const whiteKnightUrl = `${base}images/pieces/white-knight1.png`;
const blackKnightUrl = `${base}images/pieces/black-knight1.png`;

function cursorCss(dataUrl: string | null, pngUrl: string, fallback: 'auto' | 'pointer'): string {
  const tail = fallback === 'pointer' ? 'pointer' : 'auto';
  return dataUrl ? `url("${dataUrl}") 10 10, ${tail}` : `url("${pngUrl}") 12 12, ${tail}`;
}

// Browsers often ignore oversized cursor images — downscale to 32×32. Default = white knight; clickable = black knight.
Promise.all([
  makePixelCursorDataUrl(whiteKnightUrl),
  makePixelCursorDataUrl(blackKnightUrl),
]).then(([whiteData, blackData]) => {
  const defaultCursor = cursorCss(whiteData, whiteKnightUrl, 'auto');
  document.documentElement.style.cursor = defaultCursor;
  document.body.style.cursor = defaultCursor;
  document.documentElement.style.setProperty('--cursor-default', defaultCursor);
  document.documentElement.style.setProperty(
    '--cursor-pointer',
    cursorCss(blackData, blackKnightUrl, 'pointer'),
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
