import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// React Router DOM
import { BrowserRouter } from "react-router-dom";

// Redux
import { Provider } from "react-redux";
import store from "./store/index.js";

// Configuración
import { logger } from "./utils/notifications";

// Log de inicio de aplicación
logger.info("Iniciando ChatCenter Business Messenger");

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
