/**
 * providers.jsx — Árbol de Providers centralizado
 * ================================================
 * Antes: providers anidados manualmente en main.jsx + App.jsx
 *   main.jsx:  <Provider store={store}><BrowserRouter><App /></BrowserRouter></Provider>
 *   App.jsx:   <DropiProvider>...<SocketProvider token={token}>...<PresenceProvider>
 *
 * Ahora: un solo componente <AppProviders> que envuelve toda la app.
 * Esto hace que el orden de providers sea explícito y fácil de cambiar.
 *
 * MIGRACIÓN:
 *   1. Reemplazar el contenido de main.jsx por:
 *        import { AppProviders } from './refactored/app/providers';
 *        ReactDOM.createRoot(root).render(<AppProviders><App /></AppProviders>);
 *   2. Eliminar los providers sueltos de App.jsx
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Store — reutilizamos el existente mientras se migra
import store from '../src/store/index.js';

// Context providers existentes
import DropiProvider from '../src/context/DropiProvider';
import SocketProvider from '../src/context/SocketProvider';
import PresenceProvider from '../src/context/PresenceProvider';

// Hooks para obtener el token dinámicamente
import { useAuth } from '../shared/auth/useAuth';

/* ─── toaster config ─────────────────────────────────────────────── */
const TOASTER_CONFIG = {
  position: 'top-right',
  reverseOrder: false,
  gutter: 8,
  toastOptions: {
    duration: 4000,
    style: { background: '#363636', color: '#fff' },
    success: { duration: 3000, theme: { primary: 'green', secondary: 'black' } },
    error: { duration: 5000 },
  },
};

/* ─── inner providers (necesitan hooks, por eso están dentro del Router) ─ */
function InnerProviders({ children }) {
  const { token } = useAuth();

  return (
    <DropiProvider>
      <SocketProvider token={token}>
        <PresenceProvider>
          <Toaster {...TOASTER_CONFIG} />
          {children}
        </PresenceProvider>
      </SocketProvider>
    </DropiProvider>
  );
}

/* ─── root providers ─────────────────────────────────────────────── */
/**
 * Envuelve toda la aplicación.
 * Uso:
 *   <AppProviders>
 *     <AppRoutes />
 *   </AppProviders>
 */
export function AppProviders({ children }) {
  return (
    <ReduxProvider store={store}>
      <BrowserRouter>
        <InnerProviders>{children}</InnerProviders>
      </BrowserRouter>
    </ReduxProvider>
  );
}

export default AppProviders;
