import { Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import "./App.css";

// Configuración y utilidades
import { APP_CONFIG, validateConfig } from "./config";
import { logger } from "./utils/notifications";

// Páginas principales
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import Chat from "./pages/chat/Chat";

// Páginas de planes y facturación
import PlanesView from "./pages/planes/PlanesView";
import PlanesViewPrueba from "./pages/planes/PlanesViewPrueba";
import MiPlan from "./pages/facturacion/Miplan";
import MiPlanPrueba from "./pages/facturacion/MiplanPrueba";
import LandingTrial from "./pages/planes/LandingTrial";

// Páginas de gestión
import Productos from "./pages/productos/ProductosView";
import Categorias from "./pages/categorias/CategoriasView";
import Usuarios from "./pages/usuarios/UsuariosView";
import Departamentos from "./pages/departamentos/DepartamentosView";
import AdministradorPlantillas2 from "./pages/admintemplates/AdministradorPlantillas2";
import AdministradorCanales from "./pages/administradorcanales/AdministradorCanales";
import Asistentes from "./pages/asistentes/Asistentes";
import Vinculaciones from "./pages/vinculaciones/Vinculaciones";
import Conexiones from "./pages/conexiones/Conexiones";
import Conexionespruebas from "./pages/conexiones/Conexionespruebas";
import Calendario from "./pages/calendario/Calendario";

// Páginas de acceso y registro
import Access from "./pages/landing/AccessGuided";
import RegisterGuided from "./pages/landing/RegisterGuided";

// Páginas legales
import PoliticasView from "./pages/politicas/PoliticasView";
import CondicionesView from "./pages/condiciones/CondicionesView";
import PoliticaPrivacidadTikTok from "./pages/politicas/PoliticaPrivacidadTikTok";
import TerminosServicioTikTok from "./pages/politicas/TerminosServicioTikTok";
import PoliticasTikTokIndex from "./pages/politicas/PoliticasTikTokIndex";

// Páginas de autenticación
import TikTokCallback from "./pages/auth/TikTokCallback";

// Componentes de protección y layout
import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import MainLayout from "./components/layout/MainLayout";
import MainLayout_conexiones from "./components/layout/MainLayout_conexiones";
import MainLayoutPlanes from "./components/layout/MainLayoutPlanes";

import Clientes from "./components/clientes/clientes";

function App() {
  useEffect(() => {
    // Validar configuración al iniciar la app
    if (!validateConfig()) {
      logger.error("Configuración inválida detectada");
    } else {
      logger.info("ChatCenter iniciado correctamente", {
        version: APP_CONFIG.app.version,
        environment: import.meta.env.NODE_ENV,
      });
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 duration-500">
      {/* Toaster para notificaciones globales */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Configuración por defecto para todos los toasts
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          // Configuración por tipo
          success: {
            duration: 3000,
            theme: {
              primary: "green",
              secondary: "black",
            },
          },
          error: {
            duration: 5000,
          },
        }}
      />

      <Routes>
        <Route path="/politica-privacidad" element={<PoliticasView />} />
        <Route path="/condiciones-servicio" element={<CondicionesView />} />
        <Route path="/politicas-tiktok" element={<PoliticasTikTokIndex />} />
        <Route
          path="/politica-privacidad-tiktok"
          element={<PoliticaPrivacidadTikTok />}
        />
        <Route
          path="/terminos-servicio-tiktok"
          element={<TerminosServicioTikTok />}
        />

        {/* Rutas de autenticación */}
        <Route path="/auth/tiktok/callback" element={<TikTokCallback />} />

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoutes />}>
          {/* Home envuelto en MainLayout */}
          <Route
            path="/"
            element={
              <MainLayout>
                <Home />
              </MainLayout>
            }
          />

          <Route path="/chat" element={<Chat />} />

          {/*administrador-pruebas se renombra y pasa a produccion*/}
          <Route
            path="/administrador-whatsapp"
            element={
              <MainLayout>
                <AdministradorPlantillas2 />
              </MainLayout>
            }
          />

          {/*administrador-pruebas se renombra y pasa a produccion*/}
          <Route
            path="/canal-conexiones"
            element={
              <MainLayout>
                <AdministradorCanales />
              </MainLayout>
            }
          />

          <Route
            path="/asistentes"
            element={
              <MainLayout>
                <Asistentes />
              </MainLayout>
            }
          />

          <Route
            path="/integraciones"
            element={
              <MainLayout>
                <Vinculaciones />
              </MainLayout>
            }
          />

          <Route
            path="/calendario"
            element={
              <MainLayout>
                <Calendario />
              </MainLayout>
            }
          />

          <Route
            path="/conexiones"
            element={
              <MainLayout_conexiones>
                <Conexiones />
              </MainLayout_conexiones>
            }
          />

          <Route
            path="/conexionespruebas"
            element={
              <MainLayout_conexiones>
                <Conexionespruebas />
              </MainLayout_conexiones>
            }
          />
          {/* vista de usuarios */}
          <Route
            path="/usuarios"
            element={
              <MainLayout_conexiones>
                <Usuarios />
              </MainLayout_conexiones>
            }
          />
          {/* vista de departamentos */}
          <Route
            path="/departamentos"
            element={
              <MainLayout_conexiones>
                <Departamentos />
              </MainLayout_conexiones>
            }
          />

          {/* PlanesView */}
          <Route
            path="/planes_view"
            element={
              <MainLayoutPlanes>
                <PlanesView />
              </MainLayoutPlanes>
            }
          />
          <Route
            path="/planes_view_prueba"
            element={
              <MainLayoutPlanes>
                <PlanesViewPrueba />
              </MainLayoutPlanes>
            }
          />
          {/* Miplan */}
          <Route
            path="/miplan"
            element={
              <MainLayout_conexiones>
                <MiPlan />
              </MainLayout_conexiones>
            }
          />
          <Route
            path="/miplan_prueba"
            element={
              <MainLayout_conexiones>
                <MiPlanPrueba />
              </MainLayout_conexiones>
            }
          />

          <Route
            path="/landing"
            element={
              <MainLayoutPlanes>
                <LandingTrial />
              </MainLayoutPlanes>
            }
          />

          <Route
            path="/productos"
            element={
              <MainLayout>
                <Productos />
              </MainLayout>
            }
          />

          <Route
            path="/categorias"
            element={
              <MainLayout>
                <Categorias />
              </MainLayout>
            }
          />
        </Route>

        <Route path="/access" element={<Access />} />
        <Route path="/registro_guiado" element={<RegisterGuided />} />

        <Route path="/clientes" element={<Clientes />} />

        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* 
          /administrador-whatsapp, sin envolver MainLayout 
        */}
        <Route path="*" element={<h1>Esta ruta no existe</h1>} />
      </Routes>
    </div>
  );
}

export default App;
