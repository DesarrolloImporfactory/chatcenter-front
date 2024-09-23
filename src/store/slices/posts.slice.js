import { createSlice } from "@reduxjs/toolkit";
import blogApi from "../../api/blog";

const postsSlice = createSlice({
  name: "posts",
  initialState: null,
  reducers: {
    setPost: (state, action) => action.payload,
    addPost: (state, action) => {
      state.posts.unshift(action.payload);
    },
  },
});

export const { setPost, addPost } = postsSlice.actions;

export default postsSlice.reducer;

export const getAllPostThunk = () => (dispatch) => {
  blogApi
    .get("/posts")
    .then((res) => dispatch(setPost(res.data)))
    .catch((err) => {
      console.log(err);
    });
};
