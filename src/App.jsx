import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import Chat from "./pages/chat/Chat";
import PlanesView from "./pages/planes/PlanesView";
import MiPlan from "./pages/facturacion/Miplan";
import Productos from "./pages/productos/ProductosView";
import Categorias from "./pages/categorias/CategoriasView";
import Usuarios from "./pages/usuarios/UsuariosView";
import Departamentos from "./pages/departamentos/DepartamentosView";

// Importamos nuestro Layout
import MainLayout from "./components/layout/MainLayout";
import MainLayout_conexiones from "./components/layout/MainLayout_conexiones";
import AdministradorPlantillas2 from "./pages/admintemplates/AdministradorPlantillas2";
import Conexiones from "./pages/conexiones/Conexiones";
import Calendario from "./pages/calendario/Calendario";
import PoliticasView from "./pages/politicas/PoliticasView";
import CondicionesView from "./pages/condiciones/CondicionesView";

// Layout planes
import MainLayoutPlanes from "./components/layout/MainLayoutPlanes";

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 duration-500">
      <Routes>
        <Route path="/politica-privacidad" element={<PoliticasView />} />
        <Route path="/condiciones-servicio" element={<CondicionesView />} />

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
          {/* Miplan */}
          <Route path="/miplan" element={
            <MainLayout_conexiones>
              <MiPlan /> 
            </MainLayout_conexiones>
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
