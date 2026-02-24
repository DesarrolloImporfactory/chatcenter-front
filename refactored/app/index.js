/**
 * app/index.js — Entry point de la app refactorizada
 * ===================================================
 * Uso final (cuando la migración esté completa):
 *
 *   // main.jsx
 *   import { AppProviders } from './refactored/app';
 *   import { AppRoutes }    from './refactored/app';
 *
 *   ReactDOM.createRoot(root).render(
 *     <AppProviders>
 *       <AppRoutes />
 *     </AppProviders>
 *   );
 */

export { AppProviders } from './providers';
export { AppRoutes }    from './routes';
