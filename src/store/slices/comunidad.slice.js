import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import chatApi from "../../api/chatcenter";

export const fetchComunidadesThunk = createAsyncThunk(
  "comunidad/fetch",
  async (q = "", { rejectWithValue }) => {
    try {
      const { data } = await chatApi.get("/comunidades", {
        params: q ? { q } : {},
        silentError: true,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

const comunidadSlice = createSlice({
  name: "comunidad",
  initialState: { lista: [], loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchComunidadesThunk.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchComunidadesThunk.fulfilled, (s, a) => {
        s.lista = a.payload;
        s.loading = false;
      })
      .addCase(fetchComunidadesThunk.rejected, (s) => {
        s.loading = false;
      });
  },
});

export default comunidadSlice.reducer;
