import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';

// Use BASE_URL so it works for custom domains *and* /repo/ deployments.
document.body.style.cursor = `url("${import.meta.env.BASE_URL}images/bishop.png") 12 12, auto`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
