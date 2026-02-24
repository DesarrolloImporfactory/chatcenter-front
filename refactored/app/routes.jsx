/**
 * routes.jsx — Definición centralizada de rutas
 * ===============================================
 * Antes: 386 líneas en App.jsx con Routes/Route mezclados con providers y config.
 * Ahora: rutas separadas en un solo archivo, agrupadas por dominio.
 *
 * Filosofía:
 *   - Cada <Route> importa SOLO su Page (composición pura).
 *   - Los layouts se aplican mediante Route anidado (layout route).
 *   - Lazy loading con React.lazy + Suspense para reducir bundle inicial.
 *
 * MIGRACIÓN INCREMENTAL:
 *   1. Mientras coexistan ambas versiones, puedes importar pages del refactored/
 *      dentro del App.jsx existente, una ruta a la vez.
 *   2. Cuando todas las rutas apunten al refactored/, reemplazar App.jsx por este archivo.
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

/* ─── Layouts (reutilizamos los existentes mientras se migran) ──── */
import MainLayout from '../src/components/layout/MainLayout';
import MainLayout_conexiones from '../src/components/layout/MainLayout_conexiones';
import MainLayoutPlanes from '../src/components/layout/MainLayoutPlanes';
import ProtectedRoutes from '../src/pages/shared/ProtectedRoutes';

/* ─── Lazy pages ─────────────────────────────────────────────────── */
// Públicas
const Login           = lazy(() => import('../src/pages/login/Login'));
const Register        = lazy(() => import('../src/pages/register/Register'));
const Access          = lazy(() => import('../src/pages/landing/AccessGuided'));
const RegisterGuided  = lazy(() => import('../src/pages/landing/RegisterGuided'));

// Legales
const PoliticasView         = lazy(() => import('../src/pages/politicas/PoliticasView'));
const CondicionesView       = lazy(() => import('../src/pages/condiciones/CondicionesView'));
const PoliticasTikTokIndex  = lazy(() => import('../src/pages/politicas/PoliticasTikTokIndex'));
const PoliticaPrivacidadTT  = lazy(() => import('../src/pages/politicas/PoliticaPrivacidadTikTok'));
const TerminosServicioTT    = lazy(() => import('../src/pages/politicas/TerminosServicioTikTok'));

// Auth callbacks
const TikTokCallback = lazy(() => import('../src/pages/auth/TikTokCallback'));

// ── Protegidas: Home & Chat ──
const Home = lazy(() => import('../src/pages/home/Home'));
const Chat = lazy(() => import('../src/pages/chat/Chat'));
// TODO: reemplazar por → import('../pages/ChatPage') cuando la migración esté lista

// ── Protegidas: Gestión ──
const AdministradorPlantillas = lazy(() => import('../src/pages/admintemplates/AdministradorPlantillas2'));
const AdministradorCanales    = lazy(() => import('../src/pages/administradorcanales/AdministradorCanales'));
const Asistentes              = lazy(() => import('../src/pages/asistentes/Asistentes'));
const Productos               = lazy(() => import('../src/pages/productos/ProductosView'));
const Categorias              = lazy(() => import('../src/pages/categorias/CategoriasView'));
const Calendario              = lazy(() => import('../src/pages/calendario/Calendario'));
const Contactos               = lazy(() => import('../src/components/clientes/Contactos'));

// ── Protegidas: Contactos (variantes kanban) ──
const ContactosImporfactory = lazy(() => import('../src/pages/contactos/Estado_contactos_imporfactory'));
const ContactosVentas       = lazy(() => import('../src/pages/contactos/Estado_contactos_ventas'));
const ContactosImporshop    = lazy(() => import('../src/pages/contactos/Estado_contactos_imporshop'));

// ── Protegidas: Dropi ──
const IntegracionesDropi = lazy(() => import('../src/pages/dropi/IntegracionesDropi'));
const OrdenesDropi       = lazy(() => import('../src/pages/dropi/OrdenesDropi'));

// ── Protegidas: Conexiones ──
const Conexiones       = lazy(() => import('../src/pages/conexiones/Conexiones'));
const Conexionespruebas = lazy(() => import('../src/pages/conexiones/Conexionespruebas'));
const AdminConexiones  = lazy(() => import('../src/pages/conexiones/AdminConexiones'));

// ── Protegidas: Usuarios & Departamentos ──
const Usuarios      = lazy(() => import('../src/pages/usuarios/UsuariosView'));
const Departamentos = lazy(() => import('../src/pages/departamentos/DepartamentosView'));

// ── Protegidas: Planes & Facturación ──
const PlanesView       = lazy(() => import('../src/pages/planes/PlanesView'));
const PlanesViewPrueba = lazy(() => import('../src/pages/planes/PlanesViewPrueba'));
const ListaPlanes      = lazy(() => import('../src/pages/planes/listaPlanes'));
const MiPlan           = lazy(() => import('../src/pages/facturacion/Miplan'));
const MiPlanPrueba     = lazy(() => import('../src/pages/facturacion/MiplanPrueba'));
const LandingTrial     = lazy(() => import('../src/pages/planes/LandingTrial'));

/* ─── Fallback de carga ──────────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

/* ─── helper: layout wrapper ─────────────────────────────────────── */
const withMain       = (Page) => <MainLayout><Page /></MainLayout>;
const withConexiones = (Page) => <MainLayout_conexiones><Page /></MainLayout_conexiones>;
const withPlanes     = (Page) => <MainLayoutPlanes><Page /></MainLayoutPlanes>;

/* ─── AppRoutes ──────────────────────────────────────────────────── */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <div className="flex flex-col min-h-screen bg-gray-100 duration-500">
        <Routes>
          {/* ── Públicas: legales ─────────────────────────────────── */}
          <Route path="/politica-privacidad"        element={<PoliticasView />} />
          <Route path="/condiciones-servicio"        element={<CondicionesView />} />
          <Route path="/politicas-tiktok"            element={<PoliticasTikTokIndex />} />
          <Route path="/politica-privacidad-tiktok"  element={<PoliticaPrivacidadTT />} />
          <Route path="/terminos-servicio-tiktok"    element={<TerminosServicioTT />} />

          {/* ── Auth callbacks ────────────────────────────────────── */}
          <Route path="/auth/tiktok/callback" element={<TikTokCallback />} />

          {/* ── Protegidas ────────────────────────────────────────── */}
          <Route element={<ProtectedRoutes />}>
            {/* Socket + Presence se inyectan via providers.jsx ahora */}

            {/* Home */}
            <Route path="/"    element={withMain(Home)} />

            {/* Chat */}
            <Route path="/chat"        element={<Chat />} />
            <Route path="/chat/:chatId" element={<Chat />} />

            {/* Gestión (MainLayout) */}
            <Route path="/administrador-whatsapp"  element={withMain(AdministradorPlantillas)} />
            <Route path="/canal-conexiones"        element={withMain(AdministradorCanales)} />
            <Route path="/asistentes"              element={withMain(Asistentes)} />
            <Route path="/productos"               element={withMain(Productos)} />
            <Route path="/categorias"              element={withMain(Categorias)} />
            <Route path="/calendario"              element={withMain(Calendario)} />
            <Route path="/contactos"               element={withMain(Contactos)} />

            {/* Contactos kanban */}
            <Route path="/estados_contactos"           element={withMain(ContactosImporfactory)} />
            <Route path="/estados_contactos_ventas"    element={withMain(ContactosVentas)} />
            <Route path="/estados_contactos_imporshop" element={withMain(ContactosImporshop)} />

            {/* Dropi */}
            <Route path="/dropi"          element={withMain(IntegracionesDropi)} />
            <Route path="/dropi/pedidos"  element={withMain(OrdenesDropi)} />

            {/* Conexiones (MainLayout_conexiones) */}
            <Route path="/conexiones"                element={withConexiones(Conexiones)} />
            <Route path="/conexionespruebas"         element={withConexiones(Conexionespruebas)} />
            <Route path="/administrador-conexiones"  element={withConexiones(AdminConexiones)} />

            {/* Usuarios & Departamentos */}
            <Route path="/usuarios"      element={withConexiones(Usuarios)} />
            <Route path="/departamentos" element={withConexiones(Departamentos)} />

            {/* Planes (MainLayoutPlanes) */}
            <Route path="/planes"       element={withPlanes(PlanesView)} />
            <Route path="/planes_test"  element={withPlanes(PlanesViewPrueba)} />
            <Route path="/lista_planes" element={withPlanes(ListaPlanes)} />
            <Route path="/landing"      element={withPlanes(LandingTrial)} />

            {/* Facturación */}
            <Route path="/plan"           element={withConexiones(MiPlan)} />
            <Route path="/miplan_prueba"  element={withConexiones(MiPlanPrueba)} />
          </Route>

          {/* ── Públicas: acceso ──────────────────────────────────── */}
          <Route path="/access"           element={<Access />} />
          <Route path="/registro_guiado"  element={<RegisterGuided />} />
          <Route path="/login"            element={<Login />} />
          <Route path="/registro"         element={<Register />} />

          {/* ── Catch-all ─────────────────────────────────────────── */}
          <Route path="*" element={<h1>Esta ruta no existe</h1>} />
        </Routes>
      </div>
    </Suspense>
  );
}

export default AppRoutes;
