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
      const { data } = await chatApi.post("/auth/login", credentials);
      localStorage.setItem("token", data.token);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "Credenciales inválidas";
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
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "Credenciales inválidas";
      Toast.fire({ icon: "error", title: msg });
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const registerThunk = createAsyncThunk(
  "user/register",
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
