import { createSlice } from "@reduxjs/toolkit";
import chatApi from "../../api/chatcenter";

const numberSlice = createSlice({
  name: "number",
  initialState: null,
  reducers: {
    setNumber: (state, action) => action.payload,
  },
});

export const { setNumber } = numberSlice.actions;

export default numberSlice.reducer;

export const getNumbersThunk = () => (dispatch) => {
  chatApi
    .get("/numbers")
    .then((res) => {
      console.log(res);
      dispatch(setNumber(res.data));
    })
    .catch((err) => {
      console.log(err);
    });
};

export const addNumberThunk = (data) => (dispatch) => {
  chatApi
    .post("/numbers", data)
    .then((res) => {
      console.log(res);
      dispatch(getNumbersThunk());
    })
    .catch((err) => {
      console.log(err);
    });
};

export const deleteNumberThunk = (id) => (dispatch) => {
  chatApi
    .delete(`/numbers/${id}`)
    .then((res) => {
      console.log(res);
      dispatch(getNumbersThunk());
    })
    .catch((err) => {
      console.log(err);
    });
};

export const updateNumberThunk = (id, data) => (dispatch) => {
  chatApi
    .put(`/numbers/${id}`, data)
    .then((res) => {
      console.log(res);
      dispatch(getNumbersThunk());
    })
    .catch((err) => {
      console.log(err);
    });
};
