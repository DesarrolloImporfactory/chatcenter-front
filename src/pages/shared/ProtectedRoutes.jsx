import { Navigate, Outlet } from "react-router-dom";

/* --- util sencillo para leer cookies --- */
const getCookie = (name) => {
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([$?*|{}\]\\[\]\/+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const ProtectedRoutes = () => {
  /* 1️⃣  Intentar localStorage primero */
  let token = localStorage.getItem("token");

  /* 2️⃣  Si no existe, ver si hay cookie chat_token */
  if (!token || token === "undefined" || token === "") {
    const cookieToken = getCookie("chat_token");
    if (cookieToken) {
      localStorage.setItem("token", cookieToken); // lo persistimos
      token = cookieToken;
    }
  }

  /* 3️⃣  Decidir */
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
