// src/App.js
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AdministradorPlantillas from "./pages/admintemplates/AdministradorPlantillas";
import { renewThunk } from "./store/slices/user.slice";
import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import Chat from "./pages/chat/Chat";

// Importamos nuestro Layout
import MainLayout from "./components/layout/MainLayout";
function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(renewThunk());
  }, [dispatch]);

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
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* 
          /administrador-whatsapp, también envuelto en MainLayout 
        */}
        <Route
          path="/administrador-whatsapp"
          element={
            <MainLayout>
              <AdministradorPlantillas />
            </MainLayout>
          }
        />

        {/* 
          /administrador-whatsapp, sin envolver MainLayout 
        */}
        <Route
          path="/chat"
          element={
              <Chat />
          }
        />
        <Route path="*" element={<h1>Esta ruta no existe</h1>} />
      </Routes>
    </div>
  );
}

export default App;
