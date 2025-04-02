import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AdministradorPlantillas from "./components/chat/AdministradorPlantillas"

import Header from "./components/shared/Header";

import { Footer } from "./components/shared/Footer";
import { renewThunk } from "./store/slices/user.slice";

import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import Chat from "./pages/chat/Chat";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(renewThunk());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 duration-500">
      <div className="flex-grow">
        <Routes>
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/administrador-plantillas" element={<AdministradorPlantillas/>} ></Route>
          <Route path="*" element={<h1>Esta ruta no existe</h1>} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
