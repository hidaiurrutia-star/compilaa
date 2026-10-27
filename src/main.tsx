import '@fontsource-variable/inter';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AppProviders } from './app/providers';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el contenedor principal de la aplicación.');
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
