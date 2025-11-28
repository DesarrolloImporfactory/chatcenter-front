import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

const userSlice = createSlice({
  name: "user",
  initialState: null,
  reducers: {
    setUser: (state, action) => action.payload,
    logout: () => null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.fulfilled, (_, action) => action.payload)
      // .addCase(renewThunk.fulfilled, (_, action) => action.payload)
      .addCase(logout, () => null);
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;

export const loginThunk = createAsyncThunk(
  "user/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await chatApi.post("/auth/login", credentials);
      const responseData = response.data;

      // Manejar diferentes estructuras de respuesta del backend
      let token, user;

      if (responseData.status === "success") {
        // Nueva estructura del backend
        token = responseData.token;
        user = responseData.data;
      } else if (responseData.token && responseData.user) {
        // Estructura anterior del backend
        token = responseData.token;
        user = responseData.user;
      } else {
        throw new Error("Respuesta del servidor inválida");
      }

      // Guardar token usando el AuthService para consistencia
      localStorage.setItem("token", token);
      localStorage.setItem("chat_token", token);

      // Opcional: guardar datos adicionales si existen
      if (user.id_sub_usuario) {
        localStorage.setItem("id_sub_usuario", user.id_sub_usuario);
      }
      if (user.id_usuario) {
        localStorage.setItem("id_usuario", user.id_usuario);
      }
      if (user.rol) {
        localStorage.setItem("user_role", user.rol);
      }

      Toast.fire({
        icon: "success",
        title: `¡Bienvenido ${user.nombre_encargado || user.usuario}!`,
      });

      return user;
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Credenciales inválidas";
      Toast.fire({ icon: "error", title: msg });
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const newLoginThunk = createAsyncThunk(
  "user/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await chatApi.post("/auth/newLogin", credentials);
      localStorage.setItem("token", data.token);
      localStorage.setItem("id_plataforma_conf", data.id_plataforma);
      localStorage.setItem("tipo_configuracion", data.tipo_configuracion);      
      localStorage.setItem("id_configuracion", data.id_configuracion);
      let data_filtrada = {
        user: data.user,
        estado_creacion: data.estado_creacion,
      };
      return data_filtrada;
    } catch (err) {
      const msg = err.response?.data?.message || "Credenciales inválidas";
      Toast.fire({ icon: "error", title: msg });
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const registerThunk = createAsyncThunk(
  "user/registro",
  async (newUser, { rejectWithValue }) => {
    try {
      const { data } = await chatApi.post("auth/registro", newUser);
      Toast.fire({ icon: "success", title: "Cuenta creada. ¡Inicia sesión!" });
      return data.user; //opcional, por si se decide loguear al crear
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err.response?.data?.message ?? "Error",
      });
      return rejectWithValue(err.response?.data);
    }
  }
);

// export const renewThunk = createAsyncThunk(
//   "user/renew",
//   async (_, { rejectWithValue }) => {
//     try {
//       const { data } = await chatApi.get("/auth/renew");
//       localStorage.setItem("token", data.token);
//       return data.user;            // devolvemos el payload
//     } catch (err) {
//       return rejectWithValue(err.response?.data || err.message);
//     }
//   }
// );
