import { createSlice } from "@reduxjs/toolkit";
import chatApi from "../../api/chatcenter";

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
    })
    .catch((err) => {
      console.log(err);
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
