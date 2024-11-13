import { createSlice } from "@reduxjs/toolkit";
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
  },
});

export const { setUser } = userSlice.actions;

export default userSlice.reducer;

export const loginThunk = (data) => (dispatch) => {
  chatApi
    .post("/auth/login", data)
    .then((res) => {
      console.log(res);
      localStorage.setItem("token", res.data.token);
      dispatch(setUser(res.data.user));
      window.location.href = "/chat";
    })
    .catch((err) => {
      Toast.fire({
        icon: "error",
        title: "Usuario o contraseña incorrectos",
      });
    });
};

export const registerThunk = (formData) => (dispatch) => {
  chatApi
    .post("/auth/signup", formData)
    .then((res) => {
      console.log(res);
      localStorage.setItem("token", res.data.token);
      dispatch(setUser(res.data.user));
    })
    .catch((err) => {
      console.log(err);
    });
};

export const renewThunk = () => (dispatch) => {
  chatApi
    .get("/auth/renew")
    .then((res) => {
      console.log(res);
      localStorage.setItem("token", res.data.token);
      dispatch(setUser(res.data.user));
    })
    .catch((err) => {
      console.log(err);
    });
};
