import '@fontsource-variable/urbanist';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) {
  const { installDemoIpc } = await import('@/dev/demoIpc');
  installDemoIpc();
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
