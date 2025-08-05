import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AdministradorPlantillas from "./pages/admintemplates/AdministradorPlantillas";
import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import Chat from "./pages/chat/Chat";
import PlanesView from "./pages/planes/PlanesView";
import MiPlan from "./pages/facturacion/Miplan";

// Importamos nuestro Layout
import MainLayout from "./components/layout/MainLayout";
import MainLayout_conexiones from "./components/layout/MainLayout_conexiones";
import AdministradorPlantillas2 from "./pages/admintemplates/AdministradorPlantillas2";
import Conexiones from "./pages/conexiones/Conexiones";
function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 duration-500">
      <Routes>
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

          {/* 
          /administrador-whatsapp, version 1
        */}
          <Route
            path="/administrador-whatsapp-antes"
            element={
              <MainLayout>
                <AdministradorPlantillas />
              </MainLayout>
            }
          />
          {/*administrador-pruebas se renombra y pasa a produccion*/}
          <Route
            path="/administrador-whatsapp"
            element={
              <MainLayout>
                <AdministradorPlantillas2 />
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

          {/* PlanesView */}
          <Route path="/planes_view" element={<PlanesView />} />
          {/* Miplan */}
          <Route path="/Miplan" element={
            <MainLayout>
              <MiPlan /> 
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
