import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { makePixelCursorDataUrl } from './cursor/pixelCursor';

// Many browsers ignore “large” cursor images. Generate a small 32x32 cursor from bishop.png.
const bishopUrl = `${import.meta.env.BASE_URL}images/bishop.png`;
makePixelCursorDataUrl(bishopUrl).then((dataUrl) => {
  const cursor = dataUrl ? `url("${dataUrl}") 10 10, auto` : `url("${bishopUrl}") 12 12, auto`;
  document.documentElement.style.cursor = cursor;
  document.body.style.cursor = cursor;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
